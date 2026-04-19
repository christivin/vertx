import type { AgentEventPayload, EventFrame, HelloFrame, ToolStatusEventPayload } from "@vertx/realtime-gateway-contracts";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "closed" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type ToolStreamEntry = ToolStatusEventPayload;

export type RealtimeState = {
  chatMessages: ChatMessage[];
  chatStream: string | null;
  chatStreamSegments: Array<{ text: string; ts: number }>;
  chatStreamStartedAt: number | null;
  chatRunId: string | null;
  chatQueue: Array<{ id: string; text: string; createdAt: number }>;
  chatSending: boolean;
  chatLoading: boolean;
  toolStreamById: Record<string, ToolStreamEntry>;
  toolStreamOrder: string[];
  chatToolMessages: ToolStreamEntry[];
  pendingApprovals: Array<{ id: string; title: string }>;
  connectionStatus: ConnectionStatus;
  lastSeq: number | null;
  lastHelloSnapshot: HelloFrame["snapshot"] | null;
  lastError: string | null;
};

export type RealtimeAction =
  | { type: "connect.start" }
  | { type: "connect.error"; error: string }
  | { type: "connect.close" }
  | { type: "hello"; frame: HelloFrame }
  | { type: "user.queue"; text: string }
  | { type: "event"; frame: EventFrame };

export const initialRealtimeState: RealtimeState = {
  chatMessages: [],
  chatStream: null,
  chatStreamSegments: [],
  chatStreamStartedAt: null,
  chatRunId: null,
  chatQueue: [],
  chatSending: false,
  chatLoading: false,
  toolStreamById: {},
  toolStreamOrder: [],
  chatToolMessages: [],
  pendingApprovals: [],
  connectionStatus: "idle",
  lastSeq: null,
  lastHelloSnapshot: null,
  lastError: null,
};

function syncToolMessages(state: RealtimeState) {
  state.chatToolMessages = state.toolStreamOrder
    .map((id) => state.toolStreamById[id])
    .filter(Boolean);
}

function applyAgentStream(state: RealtimeState, payload: AgentEventPayload) {
  state.chatRunId = payload.runId;
  state.chatStream = `${state.chatStream ?? ""}${payload.stream}`;
  state.chatStreamStartedAt ??= payload.ts;
}

function applyToolStatus(state: RealtimeState, payload: ToolStatusEventPayload) {
  if (state.chatStream && state.chatStream.trim()) {
    state.chatStreamSegments.push({ text: state.chatStream, ts: Date.now() });
    state.chatStream = null;
    state.chatStreamStartedAt = null;
  }

  state.chatRunId = payload.runId;
  state.toolStreamById[payload.toolCallId] = payload;
  if (!state.toolStreamOrder.includes(payload.toolCallId)) {
    state.toolStreamOrder.push(payload.toolCallId);
  }
  syncToolMessages(state);
}

function applyChatEvent(state: RealtimeState, payload: Record<string, unknown>) {
  const runId = typeof payload.runId === "string" ? payload.runId : null;
  const chatState = typeof payload.state === "string" ? payload.state : null;
  const message = payload.message as Record<string, unknown> | undefined;
  const text = typeof message?.text === "string" ? message.text : null;

  if (chatState === "delta") {
    if (text) {
      state.chatRunId = runId;
      state.chatStream = `${state.chatStream ?? ""}${text}`;
      state.chatStreamStartedAt ??= Date.now();
    }
    return;
  }

  if (chatState === "final" && text) {
    if (state.chatStream && state.chatStream.trim()) {
      state.chatStreamSegments.push({ text: state.chatStream, ts: Date.now() });
    }
    state.chatMessages.push({
      id: `${runId ?? "assistant"}:${state.chatMessages.length}`,
      role: "assistant",
      text,
    });
  }

  if (chatState === "aborted" || chatState === "error" || chatState === "final") {
    state.chatRunId = null;
    state.chatSending = false;
    state.chatStream = null;
    state.chatStreamStartedAt = null;
  }
}

export function realtimeReducer(state: RealtimeState, action: RealtimeAction): RealtimeState {
  const next = structuredClone(state);

  switch (action.type) {
    case "connect.start":
      next.connectionStatus = "connecting";
      next.lastError = null;
      return next;
    case "connect.error":
      next.connectionStatus = "error";
      next.lastError = action.error;
      return next;
    case "connect.close":
      next.connectionStatus = "closed";
      return next;
    case "hello":
      next.connectionStatus = "connected";
      next.lastHelloSnapshot = action.frame.snapshot ?? null;
      return next;
    case "user.queue":
      next.chatMessages.push({
        id: `user:${next.chatMessages.length}`,
        role: "user",
        text: action.text,
      });
      next.chatQueue.push({
        id: `queued:${Date.now()}`,
        text: action.text,
        createdAt: Date.now(),
      });
      next.chatSending = true;
      return next;
    case "event":
      next.lastSeq = action.frame.seq;
      if (action.frame.event === "chat") {
        applyChatEvent(next, action.frame.payload as Record<string, unknown>);
      }
      if (action.frame.event === "agent") {
        applyAgentStream(next, action.frame.payload as AgentEventPayload);
      }
      if (action.frame.event === "tool.status") {
        applyToolStatus(next, action.frame.payload as ToolStatusEventPayload);
      }
      return next;
    default:
      return next;
  }
}
