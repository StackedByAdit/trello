import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { WebSocket } from "ws";
import { server, BOARDS } from "./index";

let wsUrl: string;

beforeAll(async () => {
  const address = server.address() as any;
  wsUrl = `ws://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.close();
});

class TestClient {
  id: string;
  ws: WebSocket;
  messages: any[] = [];
  waiters: ((msg: any) => void)[] = [];

  constructor(id: string, ws: WebSocket) {
    this.id = id;
    this.ws = ws;
    ws.on("message", (data) => {
      const parsed = JSON.parse(data.toString());
      if (this.waiters.length > 0) {
        const resolve = this.waiters.shift()!;
        resolve(parsed);
      } else {
        this.messages.push(parsed);
      }
    });
  }

  nextMessage(): Promise<any> {
    if (this.messages.length > 0) {
      return Promise.resolve(this.messages.shift());
    }
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  send(data: any) {
    this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
  }

  close() {
    this.ws.close();
  }
}

async function createClient(id: string): Promise<TestClient> {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => resolve());
    ws.on("error", reject);
  });
  return new TestClient(id, ws);
}

describe("WebSocket Server Realtime Collaboration", () => {
  it("handles 3 clients joining the same board, receives initial_state and join/leave events", async () => {
    const boardId = `ws-test-${Date.now()}`;

    const c1 = await createClient("c1");
    const c2 = await createClient("c2");
    const c3 = await createClient("c3");
    const cDiff = await createClient("cDiff");

    // 1. Client 1 joins board
    c1.send({ type: "join", boardId });
    const msg1 = await c1.nextMessage();
    expect(msg1.type).toBe("initial_state");
    expect(Array.isArray(msg1.users)).toBe(true);
    expect(msg1.users.length).toBe(0);
    expect(Array.isArray(msg1.board)).toBe(true);

    // 2. Client 2 joins board
    c2.send({ type: "join", boardId });
    const c1JoinEvent = await c1.nextMessage();
    const c2InitialState = await c2.nextMessage();

    expect(c1JoinEvent.type).toBe("join");
    expect(typeof c1JoinEvent.userId).toBe("number");

    expect(c2InitialState.type).toBe("initial_state");
    expect(c2InitialState.users.length).toBe(1);
    expect(Array.isArray(c2InitialState.board)).toBe(true);

    // 3. Client 3 joins board
    c3.send({ type: "join", boardId });
    const c1Join3 = await c1.nextMessage();
    const c2Join3 = await c2.nextMessage();
    const c3InitialState = await c3.nextMessage();

    expect(c1Join3.type).toBe("join");
    expect(c2Join3.type).toBe("join");
    expect(c1Join3.userId).toBe(c2Join3.userId);

    expect(c3InitialState.type).toBe("initial_state");
    expect(c3InitialState.users.length).toBe(2);

    // 4. Client on different board joins — clients 1, 2, 3 should receive nothing
    cDiff.send({ type: "join", boardId: "different-board-id" });
    const diffInitialState = await cDiff.nextMessage();
    expect(diffInitialState.type).toBe("initial_state");

    // Give time to ensure no message arrives at c1, c2, c3
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(c1.messages.length).toBe(0);
    expect(c2.messages.length).toBe(0);
    expect(c3.messages.length).toBe(0);

    // 5. Client 2 disconnects — client 1 and 3 receive leave event
    c2.close();

    const c1Leave = await c1.nextMessage();
    const c3Leave = await c3.nextMessage();

    expect(c1Leave.type).toBe("leave");
    expect(c3Leave.type).toBe("leave");
    expect(c1Leave.userId).toBe(c3Leave.userId);

    // Clean up remaining clients
    c1.close();
    c3.close();
    cDiff.close();

    await new Promise((resolve) => setTimeout(resolve, 100));
    // Verify BOARDS cleaned up
    expect(BOARDS[boardId]?.length ?? 0).toBe(0);
  }, 30000);

  it("handles malformed JSON without crashing or dropping connection", async () => {
    const client = await createClient("c-bad");

    // Send broken JSON
    client.send("this is not json {{{");

    // Verify socket is still open and working by sending a valid message afterwards
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(client.ws.readyState).toBe(WebSocket.OPEN);

    // Send valid join and get response
    client.send({ type: "join", boardId: "resilience-test" });
    const msg = await client.nextMessage();
    expect(msg.type).toBe("initial_state");

    client.close();
  });
});
