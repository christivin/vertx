import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer, type RawData } from "ws";
import { createOpenClawGatewaySource } from "./index";

const servers: WebSocketServer[] = [];
const cleanups: Array<() => Promise<void> | void> = [];

type TestSocket = {
  send: (data: string) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  once: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener: (...args: any[]) => void) => void;
};

function requireSocket(socket: TestSocket | null): TestSocket {
  if (!socket) {
    throw new Error("expected websocket connection");
  }
  return socket;
}

function waitForOpen(server: WebSocketServer) {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected inet address");
  }
  return `ws://127.0.0.1:${address.port}`;
}

function waitForMessage(socket: TestSocket) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const onMessage = (raw: RawData) => {
      socket.off("error", onError);
      resolve(JSON.parse(String(raw)) as Record<string, unknown>);
    };
    const onError = (error: Error) => {
      socket.off("message", onMessage);
      reject(error);
    };
    socket.once("message", onMessage);
    socket.once("error", onError);
  });
}

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    await cleanup?.();
  }
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error?: Error) => {
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

describe("OpenClawGatewaySource", () => {
  it("connects to openclaw gateway, subscribes to sessions, normalizes events, and exposes snapshot", async () => {
    const server = new WebSocketServer({ port: 0 });
    servers.push(server);

    let socketRef: TestSocket | null = null;
    server.on("connection", (socket) => {
      socketRef = socket;
      socket.send(JSON.stringify({ type: "event", event: "connect.challenge", payload: { nonce: "nonce-1" } }));
      socket.on("message", (raw: RawData) => {
        const request = JSON.parse(String(raw)) as { id?: string; method?: string; params?: unknown };
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
                snapshot: { presence: [], sessionDefaults: { mainSessionKey: "agent:main:main" } },
              },
            }),
          );
          return;
        }
        if (request.method === "sessions.subscribe") {
          socket.send(JSON.stringify({ type: "res", id: request.id, ok: true, payload: { ok: true } }));
        }
      });
    });

    const source = createOpenClawGatewaySource({
      url: waitForOpen(server),
      autoSubscribeSessions: false,
    });
    cleanups.push(() => source.close?.());

    const events: Array<{ event: string; payload: unknown }> = [];
    const unsubscribe = source.subscribe((event) => {
      events.push({ event: event.event, payload: event.payload });
    });
    cleanups.push(unsubscribe);

    const snapshot = await source.getSnapshot?.({ workspaceId: "workspace-1" });
    expect(snapshot).toMatchObject({
      presence: [],
      sessionDefaults: { mainSessionKey: "agent:main:main" },
    });

    const liveSocket = requireSocket(socketRef);

    liveSocket.send(
      JSON.stringify({
        type: "event",
        event: "chat",
        seq: 2,
        payload: {
          runId: "run-1",
          sessionKey: "session-1",
          state: "delta",
          message: {
            content: [{ type: "text", text: "正在整理日报" }],
          },
        },
      }),
    );
    liveSocket.send(
      JSON.stringify({
        type: "event",
        event: "agent",
        seq: 3,
        payload: {
          runId: "run-1",
          sessionKey: "session-1",
          stream: "tool",
          ts: 1_700_000_000_000,
          data: {
            toolCallId: "tool-1",
            name: "feishu.search_docs",
            phase: "result",
            args: { range: "7d" },
            result: { text: "命中 18 篇文档" },
          },
        },
      }),
    );
    liveSocket.send(
      JSON.stringify({
        type: "event",
        event: "exec.approval.requested",
        seq: 4,
        payload: {
          id: "approval-1",
          title: "批准执行 shell",
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      event: "chat",
      payload: {
        runId: "run-1",
        sessionKey: "session-1",
        state: "delta",
        message: { text: "正在整理日报" },
      },
    });
    expect(events[1]).toMatchObject({
      event: "tool.status",
      payload: {
        runId: "run-1",
        sessionKey: "session-1",
        toolCallId: "tool-1",
        name: "feishu.search_docs",
        phase: "completed",
        output: "命中 18 篇文档",
      },
    });
    expect(events[2]).toMatchObject({
      event: "approval.requested",
      payload: {
        id: "approval-1",
        title: "批准执行 shell",
        approvalKind: "exec",
      },
    });
  });

  it("passes request payloads through to openclaw gateway methods", async () => {
    const server = new WebSocketServer({ port: 0 });
    servers.push(server);

    let socketRef: TestSocket | null = null;
    server.on("connection", (socket) => {
      socketRef = socket;
      socket.send(JSON.stringify({ type: "event", event: "connect.challenge", payload: { nonce: "nonce-1" } }));
      socket.on("message", (raw: RawData) => {
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
                snapshot: { presence: [] },
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
                echoed: request.params,
              },
            }),
          );
        }
      });
    });

    const source = createOpenClawGatewaySource({
      url: waitForOpen(server),
      autoSubscribeSessions: false,
    });
    cleanups.push(() => source.close?.());

    await source.getSnapshot?.({ workspaceId: "workspace-1" });
    const liveSocket = requireSocket(socketRef);

    const pendingRawRequest = waitForMessage(liveSocket);
    const result = await source.request?.(
      "chat.send",
      {
        sessionKey: "session-1",
        message: { text: "整理本周日报" },
      },
      { workspaceId: "workspace-1" },
    );
    const rawRequest = await pendingRawRequest;

    expect(rawRequest.method).toBe("chat.send");
    expect(rawRequest.params).toMatchObject({
      sessionKey: "session-1",
      message: { text: "整理本周日报" },
    });
    expect(result).toMatchObject({
      accepted: true,
      echoed: {
        sessionKey: "session-1",
        message: { text: "整理本周日报" },
      },
    });
  });
});
