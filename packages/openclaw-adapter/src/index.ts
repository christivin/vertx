import { randomUUID } from "node:crypto";
import { WebSocket, type RawData } from "ws";
import type {
  EventFrame,
  GatewayEventName,
  GatewayFrame,
  HelloFrame,
  ToolStatusEventPayload,
} from "@vertx/realtime-gateway-contracts";

export type RealtimeBridgeContext = {
  workspaceId: string;
  tenantId?: string;
  userId?: string;
};

export type RealtimeSourceEvent = {
  event: GatewayEventName;
  payload: unknown;
  seq?: number;
  stateVersion?: EventFrame["stateVersion"];
};

export type RealtimeBridgeSource = {
  subscribe: (listener: (event: RealtimeSourceEvent) => void) => (() => void) | void;
  request?: (
    method: string,
    payload: unknown,
    context: RealtimeBridgeContext,
  ) => Promise<unknown> | unknown;
  getSnapshot?: (
    context: RealtimeBridgeContext,
  ) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
  close?: () => Promise<void> | void;
};

type OpenClawHelloOkFrame = {
  type: "hello-ok";
  protocol: number;
  server?: { version?: string; connId?: string };
  features?: { methods?: string[]; events?: string[] };
  snapshot?: Record<string, unknown>;
};

type OpenClawEventFrame = {
  type: "event";
  event: string;
  seq?: number;
  payload?: unknown;
  stateVersion?: EventFrame["stateVersion"];
};

type OpenClawResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type OpenClawPendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  method: string;
  timer: ReturnType<typeof setTimeout>;
};

export type OpenClawGatewaySourceOptions = {
  url: string;
  token?: string;
  password?: string;
  role?: string;
  scopes?: string[];
  caps?: string[];
  protocolVersion?: number;
  autoSubscribeSessions?: boolean;
  reconnectDelayMs?: number;
  requestTimeoutMs?: number;
  client?: {
    id?: string;
    displayName?: string;
    version?: string;
    platform?: string;
    mode?: string;
    instanceId?: string;
  };
};

const DEFAULT_OPENCLAW_PROTOCOL_VERSION = 3;
const DEFAULT_SOURCE_REQUEST_TIMEOUT_MS = 30_000;

function normalizeEventName(event: string): GatewayEventName | null {
  if (event === "chat") {
    return "chat";
  }
  if (event === "session.message") {
    return "session.message";
  }
  if (event === "sessions.changed") {
    return "sessions.changed";
  }
  if (event === "shutdown") {
    return "shutdown";
  }
  if (event === "exec.approval.requested" || event === "plugin.approval.requested") {
    return "approval.requested";
  }
  if (event === "exec.approval.resolved" || event === "plugin.approval.resolved") {
    return "approval.resolved";
  }
  return null;
}

function extractTextParts(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) {
    return [record.text];
  }
  const content = record.content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const block = entry as Record<string, unknown>;
      return typeof block.text === "string" && block.text.trim() ? block.text : null;
    })
    .filter((entry): entry is string => Boolean(entry));
}

function extractOpenClawChatPayloadText(payload: Record<string, unknown>) {
  const message = payload.message;
  const parts = extractTextParts(message);
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join("\n");
}

function stringifyToolOutput(value: unknown): string | undefined {
  const textParts = extractTextParts(value);
  if (textParts.length > 0) {
    return textParts.join("\n");
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toIsoString(ts: unknown) {
  if (typeof ts === "number" && Number.isFinite(ts)) {
    return new Date(ts).toISOString();
  }
  return new Date().toISOString();
}

function mapToolPhase(phase: string): ToolStatusEventPayload["phase"] {
  if (phase === "start") {
    return "started";
  }
  if (phase === "update") {
    return "streaming";
  }
  if (phase === "error") {
    return "failed";
  }
  return "completed";
}

function normalizeToolStatusPayload(payload: Record<string, unknown>) {
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;
  const toolCallId = typeof data.toolCallId === "string" ? data.toolCallId : null;
  const runId = typeof payload.runId === "string" ? payload.runId : null;
  const sessionKey = typeof payload.sessionKey === "string" ? payload.sessionKey : null;

  if (!toolCallId || !runId || !sessionKey) {
    return null;
  }

  const phase = typeof data.phase === "string" ? data.phase : "result";
  const output =
    phase === "update"
      ? stringifyToolOutput(data.partialResult)
      : phase === "error"
        ? stringifyToolOutput(data.error ?? data.result)
        : stringifyToolOutput(data.result ?? data.output);

  return {
    runId,
    sessionKey,
    toolCallId,
    name: typeof data.name === "string" ? data.name : "tool",
    args: data.args,
    output,
    phase: mapToolPhase(phase),
    startedAt: toIsoString(payload.ts),
    updatedAt: toIsoString(Date.now()),
  } satisfies ToolStatusEventPayload;
}

function normalizeRunStatusPayload(payload: Record<string, unknown>) {
  const phase =
    payload.data &&
    typeof payload.data === "object" &&
    typeof (payload.data as Record<string, unknown>).phase === "string"
      ? ((payload.data as Record<string, unknown>).phase as string)
      : typeof payload.phase === "string"
        ? payload.phase
        : null;

  if (!phase) {
    return null;
  }
  const status =
    phase === "start"
      ? "started"
      : phase === "end"
        ? "completed"
        : phase === "error"
          ? "error"
          : null;

  if (!status) {
    return null;
  }

  return {
    runId: typeof payload.runId === "string" ? payload.runId : null,
    sessionKey: typeof payload.sessionKey === "string" ? payload.sessionKey : null,
    status,
    phase,
    ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
  };
}

function normalizeOpenClawEvent(frame: OpenClawEventFrame): RealtimeSourceEvent[] {
  if (frame.event === "chat") {
    const payload = frame.payload as Record<string, unknown> | undefined;
    if (!payload) {
      return [];
    }
    return [
      {
        event: "chat",
        seq: frame.seq,
        stateVersion: frame.stateVersion,
        payload: {
          ...payload,
          message: {
            text: extractOpenClawChatPayloadText(payload),
          },
        },
      },
    ];
  }

  if (frame.event === "agent") {
    const payload = frame.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload.stream !== "string") {
      return [];
    }

    if (payload.stream === "tool") {
      const toolPayload = normalizeToolStatusPayload(payload);
      return toolPayload
        ? [
            {
              event: "tool.status",
              seq: frame.seq,
              stateVersion: frame.stateVersion,
              payload: toolPayload,
            },
          ]
        : [];
    }

    if (payload.stream === "lifecycle") {
      const runPayload = normalizeRunStatusPayload(payload);
      return runPayload
        ? [
            {
              event: "run.status",
              seq: frame.seq,
              stateVersion: frame.stateVersion,
              payload: runPayload,
            },
          ]
        : [];
    }

    return [];
  }

  if (frame.event === "session.tool") {
    const payload = frame.payload as Record<string, unknown> | undefined;
    if (!payload) {
      return [];
    }
    const toolPayload = normalizeToolStatusPayload(payload);
    return toolPayload
      ? [
          {
            event: "tool.status",
            seq: frame.seq,
            stateVersion: frame.stateVersion,
            payload: toolPayload,
          },
        ]
      : [];
  }

  const normalizedEvent = normalizeEventName(frame.event);
  if (!normalizedEvent) {
    return [];
  }

  const approvalKind =
    frame.event.startsWith("exec.") ? "exec" : frame.event.startsWith("plugin.") ? "plugin" : undefined;

  return [
    {
      event: normalizedEvent,
      seq: frame.seq,
      stateVersion: frame.stateVersion,
      payload:
        normalizedEvent === "approval.requested" || normalizedEvent === "approval.resolved"
          ? {
              ...(typeof frame.payload === "object" && frame.payload
                ? (frame.payload as Record<string, unknown>)
                : {}),
              ...(approvalKind ? { approvalKind } : {}),
            }
          : frame.payload,
    },
  ];
}

export class OpenClawGatewaySource implements RealtimeBridgeSource {
  private socket: WebSocket | null = null;
  private hello: OpenClawHelloOkFrame | null = null;
  private connectPromise: Promise<OpenClawHelloOkFrame> | null = null;
  private stopped = false;
  private connectSent = false;
  private connectRequestId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pending = new Map<string, OpenClawPendingRequest>();
  private listeners = new Set<(event: RealtimeSourceEvent) => void>();

  constructor(private readonly options: OpenClawGatewaySourceOptions) {}

  subscribe(listener: (event: RealtimeSourceEvent) => void) {
    this.listeners.add(listener);
    void this.ensureConnected();
    return () => {
      this.listeners.delete(listener);
    };
  }

  async request(method: string, payload: unknown, _context: RealtimeBridgeContext) {
    await this.ensureConnected();
    return await this.sendRequest(method, payload);
  }

  async getSnapshot(_context: RealtimeBridgeContext) {
    const hello = await this.ensureConnected();
    return hello.snapshot;
  }

  async close() {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("openclaw gateway source closed"));
      this.pending.delete(id);
    }
    if (!this.socket) {
      return;
    }
    const socket = this.socket;
    await new Promise<void>((resolve) => {
      this.socket = null;
      socket.once("close", () => resolve());
      socket.close();
    });
  }

  private emit(event: RealtimeSourceEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private async ensureConnected(): Promise<OpenClawHelloOkFrame> {
    if (this.hello && this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.hello;
    }
    if (this.connectPromise) {
      return await this.connectPromise;
    }

    this.connectPromise = new Promise<OpenClawHelloOkFrame>((resolve, reject) => {
      this.connectSent = false;
      this.connectRequestId = null;
      this.hello = null;
      const socket = new WebSocket(this.options.url);
      this.socket = socket;

      const fail = (error: unknown) => {
        this.connectPromise = null;
        reject(error);
      };

      socket.on("message", (raw: RawData) => {
        void this.handleMessage(raw, resolve, fail);
      });
      socket.once("error", (error: Error) => {
        fail(error);
      });
      socket.once("close", () => {
        this.socket = null;
        this.connectPromise = null;
        this.hello = null;
        if (!this.stopped && this.listeners.size > 0) {
          const reconnectDelayMs = this.options.reconnectDelayMs ?? 1_000;
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.ensureConnected();
          }, reconnectDelayMs);
        }
      });
    });

    return await this.connectPromise;
  }

  private async handleMessage(
    raw: RawData,
    resolveConnect: (value: OpenClawHelloOkFrame) => void,
    rejectConnect: (reason?: unknown) => void,
  ) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const frame = parsed as { type?: unknown };

    if (frame.type === "event") {
      const eventFrame = parsed as OpenClawEventFrame;
      if (eventFrame.event === "connect.challenge") {
        try {
          await this.sendConnectRequest();
        } catch (error) {
          rejectConnect(error);
        }
        return;
      }
      for (const normalized of normalizeOpenClawEvent(eventFrame)) {
        this.emit(normalized);
      }
      return;
    }

    if (frame.type !== "res") {
      return;
    }

    const response = parsed as OpenClawResponseFrame;
    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(response.id);

    if (!response.ok) {
      const error = new Error(response.error?.message ?? `openclaw request failed: ${pending.method}`);
      if (response.id === this.connectRequestId) {
        rejectConnect(error);
        return;
      }
      pending.reject(error);
      return;
    }

    if (response.id === this.connectRequestId) {
      const hello = response.payload as OpenClawHelloOkFrame;
      this.hello = hello;
      pending.resolve(hello);
      resolveConnect(hello);
      if (this.options.autoSubscribeSessions !== false) {
        void this.sendRequest("sessions.subscribe", {});
      }
      return;
    }

    pending.resolve(response.payload);
  }

  private async sendConnectRequest() {
    if (this.connectSent) {
      return;
    }
    this.connectSent = true;
    this.connectRequestId = `connect:${randomUUID()}`;
    await this.sendRequest(
      "connect",
      {
        minProtocol: this.options.protocolVersion ?? DEFAULT_OPENCLAW_PROTOCOL_VERSION,
        maxProtocol: this.options.protocolVersion ?? DEFAULT_OPENCLAW_PROTOCOL_VERSION,
        client: {
          id: this.options.client?.id ?? "gateway-client",
          displayName: this.options.client?.displayName ?? "Vertx Realtime Bridge",
          version: this.options.client?.version ?? "0.1.0",
          platform: this.options.client?.platform ?? "vertx",
          mode: this.options.client?.mode ?? "backend",
          instanceId: this.options.client?.instanceId,
        },
        role: this.options.role ?? "operator",
        scopes: this.options.scopes ?? ["operator.read", "operator.write", "operator.approvals"],
        caps: this.options.caps ?? ["tool-events"],
        auth:
          this.options.token || this.options.password
            ? {
                ...(this.options.token ? { token: this.options.token } : {}),
                ...(this.options.password ? { password: this.options.password } : {}),
              }
            : undefined,
      },
      this.connectRequestId,
    );
  }

  private async sendRequest(method: string, payload: unknown, explicitId?: string) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("openclaw gateway is not connected");
    }

    const id = explicitId ?? `${method}:${randomUUID()}`;
    const requestPromise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) {
          return;
        }
        this.pending.delete(id);
        reject(new Error(`openclaw request timed out: ${method}`));
      }, this.options.requestTimeoutMs ?? DEFAULT_SOURCE_REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, method, timer });
    });

    socket.send(
      JSON.stringify({
        type: "req",
        id,
        method,
        params: payload,
      }),
    );

    return await requestPromise;
  }
}

export function createOpenClawGatewaySource(options: OpenClawGatewaySourceOptions) {
  return new OpenClawGatewaySource(options);
}

export class SessionAdapter {}

export class RunAdapter {}

export class ChannelAdapter {}

export class AutomationAdapter {}

export class SkillAdapter {}

export class RealtimeBridgeAdapter {
  private nextEventSeq = 0;

  private injectContext(payload: unknown, context: RealtimeBridgeContext) {
    const contextFields = {
      workspaceId: context.workspaceId,
      ...(context.tenantId ? { tenantId: context.tenantId } : {}),
      ...(context.userId ? { userId: context.userId } : {}),
    };

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {
        ...contextFields,
        data: payload,
      };
    }

    return {
      ...(payload as Record<string, unknown>),
      ...contextFields,
    };
  }

  buildHelloFrame(
    context: RealtimeBridgeContext,
    options?: {
      protocol?: number;
      serverVersion?: string;
      methods?: string[];
      events?: GatewayEventName[];
      snapshot?: Record<string, unknown>;
    },
  ): HelloFrame {
    return {
      type: "hello",
      protocol: options?.protocol ?? 1,
      server: { version: options?.serverVersion ?? "0.1.0" },
      features: {
        methods: options?.methods ?? [],
        events: options?.events ?? [],
      },
      snapshot: this.injectContext(options?.snapshot ?? {}, context),
    };
  }

  normalizeFrame(frame: GatewayFrame, context: RealtimeBridgeContext): GatewayFrame {
    if (frame.type !== "event") {
      return frame;
    }
    return {
      ...frame,
      payload: this.injectContext(frame.payload, context),
    };
  }

  createEventFrame(event: RealtimeSourceEvent, context: RealtimeBridgeContext): EventFrame {
    const seq = event.seq ?? this.nextEventSeq + 1;
    this.nextEventSeq = Math.max(this.nextEventSeq, seq);

    return this.normalizeFrame(
      {
        type: "event",
        event: event.event,
        seq,
        payload: event.payload,
        stateVersion: event.stateVersion,
      },
      context,
    ) as EventFrame;
  }
}
