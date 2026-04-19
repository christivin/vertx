import WebSocket, { type RawData } from "ws";
import {
  mirrorRealtimeEventToProductApiRepository,
  type ProductApiMirrorEvent,
  type ProductApiRepository,
} from "@vertx/domain";
import type { EventFrame, GatewayFrame } from "@vertx/realtime-gateway-contracts";

export type RealtimeMirrorClientOptions = {
  url: string;
  repository: ProductApiRepository;
  reconnectDelayMs?: number;
  logger?: Pick<Console, "error" | "info">;
};

export type RealtimeMirrorClient = {
  close: () => Promise<void>;
};

const MIRROR_EVENTS = new Set<ProductApiMirrorEvent["event"]>([
  "chat",
  "session.message",
  "sessions.changed",
  "run.status",
  "tool.status",
  "approval.requested",
  "approval.resolved",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isGatewayFrame(value: unknown): value is GatewayFrame {
  return isRecord(value) && typeof value.type === "string";
}

function isMirrorEventFrame(frame: GatewayFrame): frame is EventFrame & ProductApiMirrorEvent {
  return frame.type === "event" && MIRROR_EVENTS.has(frame.event as ProductApiMirrorEvent["event"]);
}

function parseFrame(raw: RawData): GatewayFrame | null {
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return isGatewayFrame(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function startRealtimeMirrorClient(options: RealtimeMirrorClientOptions): RealtimeMirrorClient {
  const logger = options.logger ?? console;
  const reconnectDelayMs = options.reconnectDelayMs ?? 1_000;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clearReconnectTimer = () => {
    if (!reconnectTimer) {
      return;
    }
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) {
      return;
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  };

  const handleMessage = (raw: RawData) => {
    const frame = parseFrame(raw);
    if (!frame || !isMirrorEventFrame(frame)) {
      return;
    }
    mirrorRealtimeEventToProductApiRepository(options.repository, {
      event: frame.event,
      payload: frame.payload,
    });
  };

  function connect() {
    if (stopped) {
      return;
    }
    const nextSocket = new WebSocket(options.url);
    socket = nextSocket;

    nextSocket.on("open", () => {
      logger.info(`[vertx-api] realtime mirror connected to ${options.url}`);
    });
    nextSocket.on("message", handleMessage);
    nextSocket.on("error", (error) => {
      logger.error("[vertx-api] realtime mirror websocket error", error);
    });
    nextSocket.on("close", () => {
      if (socket === nextSocket) {
        socket = null;
      }
      scheduleReconnect();
    });
  }

  connect();

  return {
    close: async () => {
      stopped = true;
      clearReconnectTimer();
      const currentSocket = socket;
      socket = null;
      if (!currentSocket || currentSocket.readyState === WebSocket.CLOSED) {
        return;
      }
      await new Promise<void>((resolve) => {
        currentSocket.once("close", () => resolve());
        if (currentSocket.readyState === WebSocket.CONNECTING) {
          currentSocket.terminate();
          return;
        }
        currentSocket.close();
      });
    },
  };
}
