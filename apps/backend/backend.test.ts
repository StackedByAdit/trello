import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "./index";
import { prisma } from "db/client";
import jwt from "jsonwebtoken";

let server: any;
let baseUrl: string;

beforeAll(async () => {
  // Reset test database
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Comment", "IssueMapping", "Issue", "Section", "Board", "Membership", "Organization", "User" CASCADE;'
  );

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(resolve));
  }
});

// Helper for HTTP requests
async function api(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, body: data };
}

describe("Authentication Routes (/signup, /signin)", () => {
  it("happy path: signs up a new user", async () => {
    const res = await api("/signup", {
      method: "POST",
      body: { email: "userA@test.com", password: "password123" },
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("signed up");
    // Verify password is not leaked in response
    expect(res.body.password).toBeUndefined();
  });

  it("duplicate signup: rejects signing up twice with same email", async () => {
    const res = await api("/signup", {
      method: "POST",
      body: { email: "userA@test.com", password: "password123" },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("user already exists");
  });

  it("missing fields on signup: returns 400", async () => {
    const res1 = await api("/signup", { method: "POST", body: { email: "no-pass@test.com" } });
    expect(res1.status).toBe(400);
    const res2 = await api("/signup", { method: "POST", body: { password: "only-pass" } });
    expect(res2.status).toBe(400);
    const res3 = await api("/signup", { method: "POST", body: {} });
    expect(res3.status).toBe(400);
  });

  it("happy path: signs in with correct credentials", async () => {
    const res = await api("/signin", {
      method: "POST",
      body: { email: "userA@test.com", password: "password123" },
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    // Verify password is not in response
    expect(res.body.password).toBeUndefined();
  });

  it("invalid credentials on signin: returns 403", async () => {
    const resWrongPass = await api("/signin", {
      method: "POST",
      body: { email: "userA@test.com", password: "wrongpassword" },
    });
    expect(resWrongPass.status).toBe(403);

    const resNonExistent = await api("/signin", {
      method: "POST",
      body: { email: "ghost@test.com", password: "any" },
    });
    expect(resNonExistent.status).toBe(403);
  });

  it("missing fields on signin: returns 400", async () => {
    const res1 = await api("/signin", { method: "POST", body: { email: "userA@test.com" } });
    expect(res1.status).toBe(400);
    const res2 = await api("/signin", { method: "POST", body: {} });
    expect(res2.status).toBe(400);
  });
});

describe("JWT & Auth Middleware Security", () => {
  it("rejects request without authorization header (401)", async () => {
    const res = await api("/organizations");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("unauthorized");
  });

  it("rejects request with malformed or tampered token (401)", async () => {
    const res = await api("/organizations", { token: "bad.token.here" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("unauthorized");
  });

  it("rejects token signed with different secret (401)", async () => {
    const bogusToken = jwt.sign({ userId: "fake-id" }, "wrong-secret");
    const res = await api("/organizations", { token: bogusToken });
    expect(res.status).toBe(401);
  });

  it("rejects token with empty payload (401)", async () => {
    const emptyToken = jwt.sign({}, process.env.JWT_SECRET as string);
    const res = await api("/organizations", { token: emptyToken });
    expect(res.status).toBe(401);
  });
});

describe("Organization Routes (/organization, /organizations, /invite, /accept, /membership)", () => {
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;
  let orgAId: string;

  beforeAll(async () => {
    // Signup userB
    await api("/signup", { method: "POST", body: { email: "userB@test.com", password: "password123" } });
    const signinA = await api("/signin", { method: "POST", body: { email: "userA@test.com", password: "password123" } });
    tokenA = signinA.body.token;
    const signinB = await api("/signin", { method: "POST", body: { email: "userB@test.com", password: "password123" } });
    tokenB = signinB.body.token;

    const userA = await prisma.user.findUnique({ where: { email: "userA@test.com" } });
    const userB = await prisma.user.findUnique({ where: { email: "userB@test.com" } });
    userAId = userA!.id;
    userBId = userB!.id;
  });

  it("POST /organization — happy path: creates org and sets user as ADMIN", async () => {
    const res = await api("/organization", {
      method: "POST",
      token: tokenA,
      body: { name: "Org Alpha", description: "Alpha description" },
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Org Alpha");
    expect(res.body.id).toBeDefined();
    orgAId = res.body.id;

    // Verify DB state: admin membership created
    const membership = await prisma.membership.findFirst({
      where: { userId: userAId, orgId: orgAId },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("ADMIN");
  });

  it("POST /organization — missing name returns 400", async () => {
    const res = await api("/organization", {
      method: "POST",
      token: tokenA,
      body: {},
    });
    expect(res.status).toBe(400);
  });

  it("GET /organizations — user A sees Org Alpha, user B sees empty list", async () => {
    const resA = await api("/organizations", { token: tokenA });
    expect(resA.status).toBe(200);
    expect(resA.body.length).toBe(1);
    expect(resA.body[0].id).toBe(orgAId);

    const resB = await api("/organizations", { token: tokenB });
    expect(resB.status).toBe(200);
    expect(resB.body.length).toBe(0);
  });

  it("POST /invite — non-admin user B cannot invite to user A's org (403)", async () => {
    const res = await api("/invite", {
      method: "POST",
      token: tokenB,
      body: { email: "someuser@test.com", orgId: orgAId },
    });
    expect(res.status).toBe(403);
  });

  it("POST /invite — cannot invite yourself (400)", async () => {
    const res = await api("/invite", {
      method: "POST",
      token: tokenA,
      body: { email: "userA@test.com", orgId: orgAId },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("cannot invite yourself");
  });

  it("POST /invite — handles user not found (404)", async () => {
    const res = await api("/invite", {
      method: "POST",
      token: tokenA,
      body: { email: "nobody@test.com", orgId: orgAId },
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("user not found");
  });

  it("POST /invite — happy path: admin invites user B", async () => {
    const res = await api("/invite", {
      method: "POST",
      token: tokenA,
      body: { email: "userB@test.com", orgId: orgAId },
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("invited");

    // Verify DB state
    const membership = await prisma.membership.findFirst({
      where: { userId: userBId, orgId: orgAId },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("MEMBER");
  });

  it("POST /invite — handles user already a member (400)", async () => {
    const res = await api("/invite", {
      method: "POST",
      token: tokenA,
      body: { email: "userB@test.com", orgId: orgAId },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("user is already a member");
  });

  it("POST /accept — happy path for user B", async () => {
    const res = await api("/accept", {
      method: "POST",
      token: tokenB,
      body: { orgId: orgAId },
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("accepted");
  });

  it("DELETE /membership — non-admin user B cannot remove member (403)", async () => {
    const res = await api("/membership", {
      method: "POST", // wrong method
    });
    expect(res.status).toBe(404); // method not found for POST /membership

    const resDel = await api("/membership", {
      method: "DELETE",
      token: tokenB,
      body: { userId: userAId, orgId: orgAId },
    });
    expect(resDel.status).toBe(403);
  });

  it("DELETE /organization — non-admin user B cannot delete user A's org (403)", async () => {
    const res = await api("/organization", {
      method: "DELETE",
      token: tokenB,
      body: { orgId: orgAId },
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /organization — nonexistent org returns 404", async () => {
    const res = await api("/organization", {
      method: "DELETE",
      token: tokenA,
      body: { orgId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
  });
});

describe("Board, Section, Issue, and Comment Routes", () => {
  let tokenA: string;
  let tokenC: string; // Outside user, not a member of org
  let orgId: string;
  let boardId: string;
  let section1Id: string;
  let section2Id: string;
  let issueId: string;
  let commentId: string;

  beforeAll(async () => {
    const signinA = await api("/signin", { method: "POST", body: { email: "userA@test.com", password: "password123" } });
    tokenA = signinA.body.token;

    // Create userC
    await api("/signup", { method: "POST", body: { email: "userC@test.com", password: "password123" } });
    const signinC = await api("/signin", { method: "POST", body: { email: "userC@test.com", password: "password123" } });
    tokenC = signinC.body.token;

    // Get orgId
    const orgs = await api("/organizations", { token: tokenA });
    orgId = orgs.body[0].id;
  });

  // Board tests
  it("POST /board — happy path: member creates board", async () => {
    const res = await api("/board", {
      method: "POST",
      token: tokenA,
      body: { title: "Roadmap Board", organizationId: orgId },
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Roadmap Board");
    expect(res.body.id).toBeDefined();
    boardId = res.body.id;
  });

  it("POST /board — outsider user C forbidden (403)", async () => {
    const res = await api("/board", {
      method: "POST",
      token: tokenC,
      body: { title: "Hacker Board", organizationId: orgId },
    });
    expect(res.status).toBe(403);
  });

  it("GET /boards — happy path returns org boards; user C forbidden (403)", async () => {
    const resA = await api(`/boards?orgId=${orgId}`, { token: tokenA });
    expect(resA.status).toBe(200);
    expect(resA.body.length).toBe(1);
    expect(resA.body[0].id).toBe(boardId);

    const resC = await api(`/boards?orgId=${orgId}`, { token: tokenC });
    expect(resC.status).toBe(403);
  });

  it("PUT /board — happy path updates title; outsider forbidden (403)", async () => {
    const resC = await api("/board", {
      method: "PUT",
      token: tokenC,
      body: { boardId, title: "Hacked Title" },
    });
    expect(resC.status).toBe(403);

    const resA = await api("/board", {
      method: "PUT",
      token: tokenA,
      body: { boardId, title: "Sprint 1 Roadmap" },
    });
    expect(resA.status).toBe(200);
    expect(resA.body.title).toBe("Sprint 1 Roadmap");
  });

  // Section tests
  it("POST /section — happy path: creates sections with order; validates order is numeric", async () => {
    const resSec1 = await api("/section", {
      method: "POST",
      token: tokenA,
      body: { title: "To Do", boardId, order: 1 },
    });
    expect(resSec1.status).toBe(200);
    section1Id = resSec1.body.id;

    const resSec2 = await api("/section", {
      method: "POST",
      token: tokenA,
      body: { title: "Done", boardId, order: 2 },
    });
    expect(resSec2.status).toBe(200);
    section2Id = resSec2.body.id;

    // Missing/non-numeric order returns 400
    const resBad = await api("/section", {
      method: "POST",
      token: tokenA,
      body: { title: "Invalid", boardId, order: "not-a-number" },
    });
    expect(resBad.status).toBe(400);
  });

  it("GET /sections — returns sections ordered by order asc", async () => {
    const res = await api(`/sections?boardId=${boardId}`, { token: tokenA });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].order).toBe(1);
    expect(res.body[1].order).toBe(2);
  });

  it("PUT /section — updates title and order", async () => {
    const res = await api("/section", {
      method: "PUT",
      token: tokenA,
      body: { sectionId: section1Id, title: "Backlog", order: 0 },
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Backlog");
    expect(res.body.order).toBe(0);
  });

  // Issue tests
  it("POST /issue — happy path creates issue; rejects section not belonging to board", async () => {
    // Create issue on section1
    const res = await api("/issue", {
      method: "POST",
      token: tokenA,
      body: { title: "Implement Auth", description: "Use JWT", boardId, sectionId: section1Id },
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Implement Auth");
    issueId = res.body.id;

    // Bad section id returns 404
    const resBad = await api("/issue", {
      method: "POST",
      token: tokenA,
      body: { title: "Broken Issue", boardId, sectionId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(resBad.status).toBe(404);
  });

  it("GET /issues — returns all issues for the board", async () => {
    const res = await api(`/issues?boardId=${boardId}`, { token: tokenA });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(issueId);
  });

  it("GET /issue/:issueId — returns single issue with comments array included", async () => {
    const res = await api(`/issue/${issueId}`, { token: tokenA });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(issueId);
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it("PUT /issue — updates title and description", async () => {
    const res = await api("/issue", {
      method: "PUT",
      token: tokenA,
      body: { issueId, title: "Implement JWT Auth", description: "Updated description" },
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Implement JWT Auth");
  });

  it("PUT /issue/move — happy path moves issue between columns", async () => {
    const res = await api("/issue/move", {
      method: "PUT",
      token: tokenA,
      body: { issueId, sectionId: section2Id },
    });
    expect(res.status).toBe(200);
    expect(res.body.sectionId).toBe(section2Id);
  });

  it("PUT /issue/move — rejects moving to section on different board (400)", async () => {
    // Create second board with a section
    const b2 = await api("/board", { method: "POST", token: tokenA, body: { title: "Board 2", organizationId: orgId } });
    const s2 = await api("/section", { method: "POST", token: tokenA, body: { title: "B2 Sec", boardId: b2.body.id, order: 1 } });

    const res = await api("/issue/move", {
      method: "PUT",
      token: tokenA,
      body: { issueId, sectionId: s2.body.id },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("target section does not belong to the same board");
  });

  // Comment tests
  it("POST /comment — creates comment with userId from token", async () => {
    const res = await api("/comment", {
      method: "POST",
      token: tokenA,
      body: { text: "LGTM!", issueId },
    });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe("LGTM!");
    expect(res.body.userId).toBeDefined();
    commentId = res.body.id;

    // Verify comment appears in GET /issue/:issueId
    const resIssue = await api(`/issue/${issueId}`, { token: tokenA });
    expect(resIssue.body.comments.length).toBe(1);
    expect(resIssue.body.comments[0].text).toBe("LGTM!");
  });

  it("PUT /comment — non-author cannot edit comment (403)", async () => {
    // User C is not even in the org
    const resC = await api("/comment", {
      method: "PUT",
      token: tokenC,
      body: { commentId, text: "Malicious edit" },
    });
    expect(resC.status).toBe(403);
  });

  it("PUT /comment — author can update text", async () => {
    const res = await api("/comment", {
      method: "PUT",
      token: tokenA,
      body: { commentId, text: "Updated comment text" },
    });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe("Updated comment text");
  });

  it("DELETE /comment — deletes comment", async () => {
    const res = await api("/comment", {
      method: "DELETE",
      token: tokenA,
      body: { commentId },
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("comment deleted");
  });

  it("DELETE /section — deletes section", async () => {
    const res = await api("/section", {
      method: "DELETE",
      token: tokenA,
      body: { sectionId: section1Id },
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("section deleted");
  });

  it("DELETE /issue/:issueId — deletes issue", async () => {
    const res = await api(`/issue/${issueId}`, {
      method: "DELETE",
      token: tokenA,
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("issue deleted");
  });

  it("DELETE /board — cascades all child entities", async () => {
    const res = await api("/board", {
      method: "DELETE",
      token: tokenA,
      body: { boardId },
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("board deleted");

    // Verify in DB that board is gone
    const checkBoard = await prisma.board.findFirst({ where: { id: boardId } });
    expect(checkBoard).toBeNull();
  });
});

describe("Full End-to-End Flow Test", () => {
  it("complete lifecycle: signup -> signin -> org -> invite -> board -> sections -> issue -> move -> comment -> delete board", async () => {
    // 1. Signup owner & collaborator
    const ownerEmail = `e2e_owner_${Date.now()}@test.com`;
    const collabEmail = `e2e_collab_${Date.now()}@test.com`;

    const s1 = await api("/signup", { method: "POST", body: { email: ownerEmail, password: "securePass123" } });
    expect(s1.status).toBe(200);
    const s2 = await api("/signup", { method: "POST", body: { email: collabEmail, password: "securePass123" } });
    expect(s2.status).toBe(200);

    // 2. Signin both
    const signin1 = await api("/signin", { method: "POST", body: { email: ownerEmail, password: "securePass123" } });
    const ownerToken = signin1.body.token;
    const signin2 = await api("/signin", { method: "POST", body: { email: collabEmail, password: "securePass123" } });
    const collabToken = signin2.body.token;

    // 3. Create org
    const orgRes = await api("/organization", { method: "POST", token: ownerToken, body: { name: "E2E Team", description: "E2E flow" } });
    expect(orgRes.status).toBe(200);
    const e2eOrgId = orgRes.body.id;

    // Assert DB state: org exists
    const dbOrg = await prisma.organization.findUnique({ where: { id: e2eOrgId } });
    expect(dbOrg).not.toBeNull();

    // 4. Invite collaborator
    const inviteRes = await api("/invite", { method: "POST", token: ownerToken, body: { email: collabEmail, orgId: e2eOrgId } });
    expect(inviteRes.status).toBe(200);

    // Assert DB state: membership created
    const collabUser = await prisma.user.findUnique({ where: { email: collabEmail } });
    const collabMem = await prisma.membership.findFirst({ where: { userId: collabUser!.id, orgId: e2eOrgId } });
    expect(collabMem).not.toBeNull();
    expect(collabMem!.role).toBe("MEMBER");

    // 5. Create board
    const boardRes = await api("/board", { method: "POST", token: ownerToken, body: { title: "Kanban Board", organizationId: e2eOrgId } });
    expect(boardRes.status).toBe(200);
    const e2eBoardId = boardRes.body.id;

    // 6. Create sections
    const sec1Res = await api("/section", { method: "POST", token: collabToken, body: { title: "Backlog", boardId: e2eBoardId, order: 0 } });
    expect(sec1Res.status).toBe(200);
    const sec1Id = sec1Res.body.id;

    const sec2Res = await api("/section", { method: "POST", token: collabToken, body: { title: "Done", boardId: e2eBoardId, order: 1 } });
    expect(sec2Res.status).toBe(200);
    const sec2Id = sec2Res.body.id;

    // 7. Create issue
    const issueRes = await api("/issue", {
      method: "POST",
      token: collabToken,
      body: { title: "Setup CI/CD", description: "GitHub Actions", boardId: e2eBoardId, sectionId: sec1Id },
    });
    expect(issueRes.status).toBe(200);
    const e2eIssueId = issueRes.body.id;

    // Assert DB state: issue belongs to sec1
    const dbIssue = await prisma.issue.findUnique({ where: { id: e2eIssueId } });
    expect(dbIssue!.sectionId).toBe(sec1Id);

    // 8. Move issue to Done
    const moveRes = await api("/issue/move", {
      method: "PUT",
      token: collabToken,
      body: { issueId: e2eIssueId, sectionId: sec2Id },
    });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.sectionId).toBe(sec2Id);

    // Assert DB state: issue now in sec2
    const movedIssue = await prisma.issue.findUnique({ where: { id: e2eIssueId } });
    expect(movedIssue!.sectionId).toBe(sec2Id);

    // 9. Add comment
    const commentRes = await api("/comment", {
      method: "POST",
      token: ownerToken,
      body: { text: "Nice work finishing CI/CD!", issueId: e2eIssueId },
    });
    expect(commentRes.status).toBe(200);
    const e2eCommentId = commentRes.body.id;

    // Assert DB state: comment exists
    const dbComment = await prisma.comment.findUnique({ where: { id: e2eCommentId } });
    expect(dbComment).not.toBeNull();
    expect(dbComment!.text).toBe("Nice work finishing CI/CD!");

    // 10. Delete board (cascades sections, issues, comments)
    const delBoardRes = await api("/board", { method: "DELETE", token: ownerToken, body: { boardId: e2eBoardId } });
    expect(delBoardRes.status).toBe(200);

    // Assert DB state: board, sections, issues, comments are all deleted
    const checkBoard = await prisma.board.findUnique({ where: { id: e2eBoardId } });
    expect(checkBoard).toBeNull();

    const checkSecs = await prisma.section.findMany({ where: { boardId: e2eBoardId } });
    expect(checkSecs.length).toBe(0);

    const checkIssue = await prisma.issue.findUnique({ where: { id: e2eIssueId } });
    expect(checkIssue).toBeNull();

    const checkComment = await prisma.comment.findUnique({ where: { id: e2eCommentId } });
    expect(checkComment).toBeNull();
  }, 30000);
});
