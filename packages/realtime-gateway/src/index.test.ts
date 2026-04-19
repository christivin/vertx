import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createRealtimeGatewayServer } from "./index";

type JsonFrame = Record<string, unknown>;

function nextFrame(socket: WebSocket) {
  return new Promise<JsonFrame>((resolve, reject) => {
    const handleMessage = (raw: WebSocket.RawData) => {
      socket.off("error", handleError);
      resolve(JSON.parse(String(raw)) as JsonFrame);
    };
    const handleError = (error: Error) => {
      socket.off("message", handleMessage);
      reject(error);
    };

    socket.once("message", handleMessage);
    socket.once("error", handleError);
  });
}

function waitForOpen(socket: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

const servers: Array<ReturnType<typeof createRealtimeGatewayServer>> = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  await Promise.all(
    sockets.splice(0).map(
      (socket) =>
        new Promise<void>((resolve) => {
          socket.once("close", () => resolve());
          socket.close();
        }),
    ),
  );
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("createRealtimeGatewayServer", () => {
  it("sends hello on connect and broadcasts normalized event frames", async () => {
    const server = createRealtimeGatewayServer({
      workspaceId: "workspace-1",
      serverVersion: "0.2.0",
      snapshot: () => ({ sessionCount: 3 }),
    });
    servers.push(server);

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected an inet websocket address");
    }

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
    sockets.push(socket);
    const helloPromise = nextFrame(socket);
    await waitForOpen(socket);

    const hello = await helloPromise;
    expect(hello.type).toBe("hello");
    expect(hello.server).toEqual({ version: "0.2.0" });
    expect(hello.snapshot).toMatchObject({
      sessionCount: 3,
      workspaceId: "workspace-1",
    });

    server.publish({
      event: "tool.status",
      payload: {
        runId: "run-1",
        sessionKey: "session-1",
        toolCallId: "tool-1",
        name: "feishu.search_docs",
        phase: "started",
        startedAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
      },
    });

    const event = await nextFrame(socket);
    expect(event.type).toBe("event");
    expect(event.event).toBe("tool.status");
    expect(event.payload).toMatchObject({
      workspaceId: "workspace-1",
      toolCallId: "tool-1",
    });
  });

  it("handles request frames and returns response frames", async () => {
    const server = createRealtimeGatewayServer({
      workspaceId: "workspace-2",
      requestHandler: async ({ method, payload, client }) => ({
        method,
        payload,
        workspaceId: client.workspaceId,
      }),
    });
    servers.push(server);

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected an inet websocket address");
    }

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
    sockets.push(socket);
    const helloPromise = nextFrame(socket);
    await waitForOpen(socket);
    await helloPromise;

    socket.send(
      JSON.stringify({
        type: "req",
        id: "req-1",
        method: "chat.send",
        payload: { text: "整理本周日报" },
      }),
    );

    const response = await nextFrame(socket);
    expect(response).toMatchObject({
      type: "res",
      id: "req-1",
      ok: true,
      payload: {
        method: "chat.send",
        workspaceId: "workspace-2",
      },
    });
  });
});
