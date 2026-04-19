export type HelloFrame = {
  type: "hello";
  protocol: number;
  server: { version: string };
  features?: { methods?: string[]; events?: string[] };
  snapshot?: Record<string, unknown>;
};

export type RequestFrame = {
  type: "req";
  id: string;
  method: string;
  payload?: unknown;
};

export type ResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ErrorFrame = {
  type: "error";
  code: string;
  message: string;
};

export type ChatEventPayload = {
  runId: string;
  sessionKey: string;
  state: "delta" | "final" | "aborted" | "error";
  message?: { text?: string };
  errorMessage?: string;
};

export type AgentEventPayload = {
  runId: string;
  seq: number;
  stream: string;
  ts: number;
  sessionKey?: string;
  data: Record<string, unknown>;
};

export type ToolStatusEventPayload = {
  runId: string;
  sessionKey: string;
  toolCallId: string;
  name: string;
  args?: unknown;
  output?: string;
  phase: "started" | "streaming" | "completed" | "failed";
  startedAt: string;
  updatedAt: string;
};

export type EventFrame = {
  type: "event";
  event:
    | "chat"
    | "agent"
    | "session.message"
    | "sessions.changed"
    | "run.status"
    | "tool.status"
    | "approval.requested"
    | "approval.resolved"
    | "shutdown";
  seq: number;
  payload: unknown;
  stateVersion?: { presence?: number; health?: number };
};

export type GatewayEventName = EventFrame["event"];

export type GatewayFrame = HelloFrame | RequestFrame | ResponseFrame | ErrorFrame | EventFrame;
