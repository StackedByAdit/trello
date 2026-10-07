import type {
  User,
  Organization,
  Membership,
  Board,
  Section,
  Issue,
  IssueWithComments,
  Comment,
  MessageResponse,
  AuthResponse,
  SignupInput,
  SigninInput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  DeleteOrganizationInput,
  InviteInput,
  AcceptInput,
  RemoveMemberInput,
  CreateBoardInput,
  UpdateBoardInput,
  DeleteBoardInput,
  CreateSectionInput,
  UpdateSectionInput,
  DeleteSectionInput,
  CreateIssueInput,
  UpdateIssueInput,
  MoveIssueInput,
  CreateCommentInput,
  UpdateCommentInput,
  DeleteCommentInput,
} from "./types";

const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.BUN_PUBLIC_API_URL) ||
  "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Core typed fetch wrapper
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (requiresAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = token;
    }
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      ...restOptions,
    });
  } catch (err: any) {
    throw new ApiError(0, err?.message || "Network request failed");
  }

  let data: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      data?.message || `Request failed with status ${response.status}`;

    // Handle 401 Unauthorized: dispatch global event for AuthProvider redirect
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("api:unauthorized", { detail: { endpoint, status: 401 } })
      );
    }

    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

// ==========================================
// Authentication Routes
// ==========================================

export async function signup(body: SignupInput): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/signup", {
    method: "POST",
    body: JSON.stringify(body),
    requiresAuth: false,
  });
}

export async function signin(body: SigninInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/signin", {
    method: "POST",
    body: JSON.stringify(body),
    requiresAuth: false,
  });
}

// ==========================================
// Organization & Membership Routes
// ==========================================

export async function getOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/organizations", {
    method: "GET",
  });
}

export async function createOrganization(
  body: CreateOrganizationInput
): Promise<Organization> {
  return apiFetch<Organization>("/organization", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateOrganization(
  body: UpdateOrganizationInput
): Promise<Organization> {
  return apiFetch<Organization>("/organization", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getMembers(orgId: string): Promise<Membership[]> {
  return apiFetch<Membership[]>(`/members?orgId=${encodeURIComponent(orgId)}`, {
    method: "GET",
  });
}

export async function deleteOrganization(
  bodyOrOrgId: DeleteOrganizationInput | string
): Promise<MessageResponse> {
  const body =
    typeof bodyOrOrgId === "string" ? { orgId: bodyOrOrgId } : bodyOrOrgId;
  return apiFetch<MessageResponse>("/organization", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export async function invite(body: InviteInput): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function accept(
  bodyOrOrgId: AcceptInput | string
): Promise<MessageResponse> {
  const body =
    typeof bodyOrOrgId === "string" ? { orgId: bodyOrOrgId } : bodyOrOrgId;
  return apiFetch<MessageResponse>("/accept", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeMember(
  body: RemoveMemberInput
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/membership", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

// ==========================================
// Board Routes
// ==========================================

export async function getBoards(orgId: string): Promise<Board[]> {
  return apiFetch<Board[]>(`/boards?orgId=${encodeURIComponent(orgId)}`, {
    method: "GET",
  });
}

export async function createBoard(body: CreateBoardInput): Promise<Board> {
  return apiFetch<Board>("/board", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateBoard(body: UpdateBoardInput): Promise<Board> {
  return apiFetch<Board>("/board", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteBoard(
  bodyOrBoardId: DeleteBoardInput | string
): Promise<MessageResponse> {
  const body =
    typeof bodyOrBoardId === "string"
      ? { boardId: bodyOrBoardId }
      : bodyOrBoardId;
  return apiFetch<MessageResponse>("/board", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

// ==========================================
// Section Routes
// ==========================================

export async function getSections(boardId: string): Promise<Section[]> {
  return apiFetch<Section[]>(`/sections?boardId=${encodeURIComponent(boardId)}`, {
    method: "GET",
  });
}

export async function createSection(
  body: CreateSectionInput
): Promise<Section> {
  return apiFetch<Section>("/section", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSection(
  body: UpdateSectionInput
): Promise<Section> {
  return apiFetch<Section>("/section", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSection(
  bodyOrSectionId: DeleteSectionInput | string
): Promise<MessageResponse> {
  const body =
    typeof bodyOrSectionId === "string"
      ? { sectionId: bodyOrSectionId }
      : bodyOrSectionId;
  return apiFetch<MessageResponse>("/section", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

// ==========================================
// Issue Routes
// ==========================================

export async function getIssues(boardId: string): Promise<Issue[]> {
  return apiFetch<Issue[]>(`/issues?boardId=${encodeURIComponent(boardId)}`, {
    method: "GET",
  });
}

export async function getIssue(issueId: string): Promise<IssueWithComments> {
  return apiFetch<IssueWithComments>(`/issue/${encodeURIComponent(issueId)}`, {
    method: "GET",
  });
}

export async function createIssue(body: CreateIssueInput): Promise<Issue> {
  return apiFetch<Issue>("/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateIssue(body: UpdateIssueInput): Promise<Issue> {
  return apiFetch<Issue>("/issue", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function moveIssue(body: MoveIssueInput): Promise<Issue> {
  return apiFetch<Issue>("/issue/move", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteIssue(issueId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/issue/${encodeURIComponent(issueId)}`, {
    method: "DELETE",
  });
}

// ==========================================
// Comment Routes
// ==========================================

export async function createComment(
  body: CreateCommentInput
): Promise<Comment> {
  return apiFetch<Comment>("/comment", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateComment(
  body: UpdateCommentInput
): Promise<Comment> {
  return apiFetch<Comment>("/comment", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteComment(
  bodyOrCommentId: DeleteCommentInput | string
): Promise<MessageResponse> {
  const body =
    typeof bodyOrCommentId === "string"
      ? { commentId: bodyOrCommentId }
      : bodyOrCommentId;
  return apiFetch<MessageResponse>("/comment", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export const api = {
  signup,
  signin,
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getMembers,
  invite,
  accept,
  removeMember,
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getIssues,
  getIssue,
  createIssue,
  updateIssue,
  moveIssue,
  deleteIssue,
  createComment,
  updateComment,
  deleteComment,
};

export default api;
