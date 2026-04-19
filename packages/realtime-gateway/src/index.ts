import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Socket as NetSocket } from "node:net";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import {
  RealtimeBridgeAdapter,
  type RealtimeBridgeContext,
  type RealtimeBridgeSource,
  type RealtimeSourceEvent,
} from "@vertx/openclaw-adapter";
import type {
  ErrorFrame,
  EventFrame,
  GatewayEventName,
  RequestFrame,
  ResponseFrame,
} from "@vertx/realtime-gateway-contracts";

const DEFAULT_EVENTS: GatewayEventName[] = [
  "chat",
  "agent",
  "session.message",
  "sessions.changed",
  "run.status",
  "tool.status",
  "approval.requested",
  "approval.resolved",
  "shutdown",
];

export type RealtimeGatewayAuditEntry = {
  ts: number;
  workspaceId: string;
  clientId?: string;
  type: "connect" | "event" | "request" | "request.error";
  frame?: EventFrame | ResponseFrame | ErrorFrame;
  method?: string;
};

export type RealtimeGatewayClientContext = RealtimeBridgeContext & {
  clientId: string;
  connectedAt: string;
};

export type RealtimeGatewayOptions = {
  workspaceId: string;
  host?: string;
  port?: number;
  path?: string;
  server?: HttpServer;
  serverVersion?: string;
  methods?: string[];
  events?: GatewayEventName[];
  source?: RealtimeBridgeSource;
  snapshot?: (
    context: RealtimeBridgeContext,
  ) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
  requestHandler?: (input: {
    method: string;
    payload: unknown;
    client: RealtimeGatewayClientContext;
  }) => Promise<unknown> | unknown;
  resolveContext?: (request: IncomingMessage) => Partial<RealtimeBridgeContext>;
  recordAudit?: (entry: RealtimeGatewayAuditEntry) => void;
};

export type RealtimeGatewayServer = {
  publish: (event: RealtimeSourceEvent) => void;
  close: () => Promise<void>;
  address: () => ReturnType<WebSocketServer["address"]>;
};

function toErrorFrame(code: string, message: string): ErrorFrame {
  return {
    type: "error",
    code,
    message,
  };
}

function toResponseError(error: unknown) {
  if (error instanceof Error) {
    return {
      code: "request_failed",
      message: error.message,
    };
  }
  return {
    code: "request_failed",
    message: "realtime gateway request failed",
  };
}

function isRequestFrame(value: unknown): value is RequestFrame {
  if (!value || typeof value !== "object") {
    return false;
  }
  const frame = value as Record<string, unknown>;
  return frame.type === "req" && typeof frame.id === "string" && typeof frame.method === "string";
}

function sendFrame(socket: WebSocket, frame: ErrorFrame | EventFrame | ResponseFrame) {
  socket.send(JSON.stringify(frame));
}

export function createRealtimeGatewayServer(options: RealtimeGatewayOptions): RealtimeGatewayServer {
  const adapter = new RealtimeBridgeAdapter();
  const clients = new Set<WebSocket>();
  const clientContexts = new WeakMap<WebSocket, RealtimeGatewayClientContext>();
  const wss = options.server
    ? new WebSocketServer({ noServer: true })
    : new WebSocketServer({
        host: options.host,
        port: options.port ?? 0,
      });

  const baseContext: RealtimeBridgeContext = {
    workspaceId: options.workspaceId,
  };

  const unsubscribe =
    options.source?.subscribe((event) => {
      publish(event);
    }) ?? undefined;

  const upgradeHandler = options.server
    ? (request: IncomingMessage, socket: NetSocket, head: Buffer) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        const expectedPath = options.path ?? "/";
        if (pathname !== expectedPath) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          wss.emit("connection", ws, request);
        });
      }
    : null;

  if (options.server && upgradeHandler) {
    options.server.on("upgrade", upgradeHandler);
  }

  const resolveClientContext = (request?: IncomingMessage): RealtimeGatewayClientContext => {
    const resolved = request ? options.resolveContext?.(request) : undefined;
    return {
      workspaceId: resolved?.workspaceId ?? options.workspaceId,
      tenantId: resolved?.tenantId,
      userId: resolved?.userId,
      clientId: randomUUID(),
      connectedAt: new Date().toISOString(),
    };
  };

  const sendHello = async (socket: WebSocket, context: RealtimeGatewayClientContext) => {
    const snapshotFromOptions = options.snapshot ? await options.snapshot(context) : undefined;
    const snapshotFromSource =
      snapshotFromOptions ?? (options.source?.getSnapshot ? await options.source.getSnapshot(context) : undefined);
    const helloFrame = adapter.buildHelloFrame(context, {
      serverVersion: options.serverVersion ?? "0.1.0",
      methods: options.methods ?? ["chat.send", "chat.history"],
      events: options.events ?? DEFAULT_EVENTS,
      snapshot: snapshotFromSource,
    });

    socket.send(JSON.stringify(helloFrame));
    options.recordAudit?.({
      ts: Date.now(),
      workspaceId: context.workspaceId,
      clientId: context.clientId,
      type: "connect",
    });
  };

  const handleRequestFrame = async (
    socket: WebSocket,
    requestFrame: RequestFrame,
    client: RealtimeGatewayClientContext,
  ) => {
    if (!options.requestHandler && !options.source?.request) {
      const frame: ResponseFrame = {
        type: "res",
        id: requestFrame.id,
        ok: false,
        error: {
          code: "method_not_supported",
          message: `unsupported method: ${requestFrame.method}`,
        },
      };
      sendFrame(socket, frame);
      options.recordAudit?.({
        ts: Date.now(),
        workspaceId: client.workspaceId,
        clientId: client.clientId,
        type: "request.error",
        frame,
        method: requestFrame.method,
      });
      return;
    }

    try {
      const result = options.requestHandler
        ? await options.requestHandler({
            method: requestFrame.method,
            payload: requestFrame.payload,
            client,
          })
        : await options.source?.request?.(requestFrame.method, requestFrame.payload, client);
      const frame: ResponseFrame = {
        type: "res",
        id: requestFrame.id,
        ok: true,
        payload: result,
      };
      sendFrame(socket, frame);
      options.recordAudit?.({
        ts: Date.now(),
        workspaceId: client.workspaceId,
        clientId: client.clientId,
        type: "request",
        frame,
        method: requestFrame.method,
      });
    } catch (error) {
      const frame: ResponseFrame = {
        type: "res",
        id: requestFrame.id,
        ok: false,
        error: toResponseError(error),
      };
      sendFrame(socket, frame);
      options.recordAudit?.({
        ts: Date.now(),
        workspaceId: client.workspaceId,
        clientId: client.clientId,
        type: "request.error",
        frame,
        method: requestFrame.method,
      });
    }
  };

  const handleSocketMessage = async (socket: WebSocket, raw: RawData) => {
    const client = clientContexts.get(socket);
    if (!client) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      sendFrame(socket, toErrorFrame("invalid_json", "invalid realtime frame"));
      return;
    }

    if (!isRequestFrame(parsed)) {
      sendFrame(socket, toErrorFrame("invalid_frame", "expected request frame"));
      return;
    }

    await handleRequestFrame(socket, parsed, client);
  };

  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    const clientContext = resolveClientContext(request);
    clients.add(socket);
    clientContexts.set(socket, clientContext);
    void sendHello(socket, clientContext);

    socket.on("message", (raw: RawData) => {
      void handleSocketMessage(socket, raw);
    });

    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  function publish(event: RealtimeSourceEvent) {
    const frame = adapter.createEventFrame(event, baseContext);
    for (const client of clients) {
      sendFrame(client, frame);
    }
    options.recordAudit?.({
      ts: Date.now(),
      workspaceId: options.workspaceId,
      type: "event",
      frame,
    });
  }

  return {
    publish,
    address: () => wss.address(),
    close: async () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
      if (options.server && upgradeHandler) {
        options.server.off("upgrade", upgradeHandler);
      }
      for (const client of clients) {
        client.close();
      }
      await new Promise<void>((resolve) => {
        wss.once("close", () => {
          resolve();
        });
        wss.close();
      });
    },
  };
}
