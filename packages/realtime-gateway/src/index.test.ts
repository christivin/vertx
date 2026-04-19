import { afterEach, describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import { createOpenClawBackedRealtimeGatewayServer, createRealtimeGatewayServer } from "./index";

type JsonFrame = Record<string, unknown>;

function requireSocket(socket: WebSocket | null): WebSocket {
  if (!socket) {
    throw new Error("expected websocket connection");
  }
  return socket;
}

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

function waitForClose(socket: WebSocket) {
  return new Promise<number>((resolve, reject) => {
    socket.once("close", (code) => resolve(code));
    socket.once("error", reject);
  });
}

function waitForFailedConnection(socket: WebSocket) {
  return new Promise<"close" | "error">((resolve) => {
    const finish = (outcome: "close" | "error") => {
      socket.off("close", handleClose);
      socket.off("error", handleError);
      if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
        socket.terminate();
      }
      resolve(outcome);
    };
    const handleClose = () => finish("close");
    const handleError = () => finish("error");

    socket.once("close", handleClose);
    socket.once("error", handleError);
  });
}

const servers: Array<ReturnType<typeof createRealtimeGatewayServer>> = [];
const sockets: WebSocket[] = [];
const upstreamServers: WebSocketServer[] = [];

afterEach(async () => {
  await Promise.all(
    sockets.splice(0).map(
      (socket) =>
        new Promise<void>((resolve) => {
          if (socket.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          socket.once("close", () => resolve());
          if (socket.readyState === WebSocket.CONNECTING) {
            socket.terminate();
            return;
          }
          socket.close();
        }),
    ),
  );
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(
    upstreamServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    ),
  );
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

  it("enforces the configured path for standalone websocket mode", async () => {
    const server = createRealtimeGatewayServer({
      workspaceId: "workspace-path",
      path: "/gateway/realtime",
    });
    servers.push(server);

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected an inet websocket address");
    }

    const goodSocket = new WebSocket(`ws://127.0.0.1:${address.port}/gateway/realtime`);
    sockets.push(goodSocket);
    const goodHelloPromise = nextFrame(goodSocket);
    await waitForOpen(goodSocket);
    const goodHello = await goodHelloPromise;
    expect(goodHello.type).toBe("hello");

    const badSocket = new WebSocket(`ws://127.0.0.1:${address.port}/wrong-path`);
    sockets.push(badSocket);
    await expect(waitForFailedConnection(badSocket)).resolves.toSatisfy((outcome) =>
      ["close", "error"].includes(outcome),
    );
  });

  it("relays normalized openclaw gateway events through a composed server factory", async () => {
    const upstream = new WebSocketServer({ port: 0 });
    upstreamServers.push(upstream);

    let upstreamSocket: WebSocket | null = null;
    upstream.on("connection", (socket) => {
      upstreamSocket = socket;
      socket.send(
        JSON.stringify({
          type: "event",
          event: "connect.challenge",
          payload: { nonce: "nonce-1" },
        }),
      );
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as {
          id?: string;
          method?: string;
          params?: Record<string, unknown>;
        };
        if (request.method === "connect") {
          socket.send(
            JSON.stringify({
              type: "res",
              id: request.id,
              ok: true,
              payload: {
                type: "hello-ok",
                protocol: 3,
                server: { version: "openclaw-test" },
                snapshot: { sessionDefaults: { mainSessionKey: "agent:main:main" } },
              },
            }),
          );
          return;
        }
        if (request.method === "sessions.subscribe") {
          socket.send(JSON.stringify({ type: "res", id: request.id, ok: true, payload: { ok: true } }));
          return;
        }
        if (request.method === "chat.send") {
          socket.send(
            JSON.stringify({
              type: "res",
              id: request.id,
              ok: true,
              payload: {
                accepted: true,
                upstreamMethod: request.method,
              },
            }),
          );
          return;
        }
        if (request.method === "chat.history") {
          socket.send(
            JSON.stringify({
              type: "res",
              id: request.id,
              ok: true,
              payload: {
                items: [
                  {
                    id: "history-1",
                    role: "assistant",
                    text: "历史回答",
                  },
                ],
                cursor: null,
                upstreamMethod: request.method,
                echoed: request.params,
              },
            }),
          );
        }
      });
    });

    const upstreamAddress = upstream.address();
    if (!upstreamAddress || typeof upstreamAddress === "string") {
      throw new Error("expected an inet upstream websocket address");
    }

    const server = createOpenClawBackedRealtimeGatewayServer({
      workspaceId: "workspace-3",
      openclaw: {
        url: `ws://127.0.0.1:${upstreamAddress.port}`,
      },
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

    expect(hello).toMatchObject({
      type: "hello",
      snapshot: {
        workspaceId: "workspace-3",
        sessionDefaults: { mainSessionKey: "agent:main:main" },
      },
    });

    const liveUpstreamSocket = requireSocket(upstreamSocket);

    liveUpstreamSocket.send(
      JSON.stringify({
        type: "event",
        event: "agent",
        seq: 2,
        payload: {
          runId: "run-1",
          sessionKey: "session-1",
          stream: "tool",
          ts: 1_700_000_000_000,
          data: {
            toolCallId: "tool-1",
            name: "feishu.search_docs",
            phase: "result",
            result: { text: "命中 18 篇文档" },
          },
        },
      }),
    );

    const toolEvent = await nextFrame(socket);
    expect(toolEvent).toMatchObject({
      type: "event",
      event: "tool.status",
      payload: {
        workspaceId: "workspace-3",
        toolCallId: "tool-1",
        output: "命中 18 篇文档",
      },
    });

    liveUpstreamSocket.send(
      JSON.stringify({
        type: "event",
        event: "session.message",
        seq: 3,
        payload: {
          sessionKey: "session-1",
          messageId: "message-1",
          messageSeq: 8,
          message: {
            role: "assistant",
            content: [{ type: "text", text: "已更新会话记录" }],
          },
        },
      }),
    );

    const sessionMessageEvent = await nextFrame(socket);
    expect(sessionMessageEvent).toMatchObject({
      type: "event",
      event: "session.message",
      payload: {
        workspaceId: "workspace-3",
        sessionKey: "session-1",
        messageId: "message-1",
        messageSeq: 8,
      },
    });

    liveUpstreamSocket.send(
      JSON.stringify({
        type: "event",
        event: "sessions.changed",
        seq: 4,
        payload: {
          sessionKey: "session-1",
          phase: "message",
          messageId: "message-1",
          messageSeq: 8,
        },
      }),
    );

    const sessionsChangedEvent = await nextFrame(socket);
    expect(sessionsChangedEvent).toMatchObject({
      type: "event",
      event: "sessions.changed",
      payload: {
        workspaceId: "workspace-3",
        sessionKey: "session-1",
        phase: "message",
        messageId: "message-1",
        messageSeq: 8,
      },
    });

    socket.send(
      JSON.stringify({
        type: "req",
        id: "req-upstream",
        method: "chat.send",
        payload: {
          sessionKey: "session-1",
          message: { text: "整理本周日报" },
        },
      }),
    );

    const response = await nextFrame(socket);
    expect(response).toMatchObject({
      type: "res",
      id: "req-upstream",
      ok: true,
      payload: {
        accepted: true,
        upstreamMethod: "chat.send",
      },
    });

    socket.send(
      JSON.stringify({
        type: "req",
        id: "req-history",
        method: "chat.history",
        payload: {
          sessionKey: "session-1",
          limit: 20,
          beforeSeq: 42,
        },
      }),
    );

    const historyResponse = await nextFrame(socket);
    expect(historyResponse).toMatchObject({
      type: "res",
      id: "req-history",
      ok: true,
      payload: {
        items: [
          {
            id: "history-1",
            role: "assistant",
            text: "历史回答",
          },
        ],
        cursor: null,
        upstreamMethod: "chat.history",
        echoed: {
          sessionKey: "session-1",
          limit: 20,
          beforeSeq: 42,
        },
      },
    });
  });
});
