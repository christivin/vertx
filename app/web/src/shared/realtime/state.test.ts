import { mockHelloFrame, mockRealtimeFrames } from "@/shared/realtime/mock-frames";
import { initialRealtimeState, realtimeReducer } from "@/shared/realtime/state";

describe("realtimeReducer", () => {
  it("accumulates stream and tool state like openclaw-style realtime UI", () => {
    let state = realtimeReducer(initialRealtimeState, { type: "hello", frame: mockHelloFrame });
    state = realtimeReducer(state, { type: "user.queue", text: "整理本周日报" });
    for (const frame of mockRealtimeFrames) {
      state = realtimeReducer(state, { type: "event", frame });
    }

    expect(state.connectionStatus).toBe("connected");
    expect(state.chatMessages.some((item) => item.role === "assistant")).toBe(true);
    expect(state.toolStreamOrder).toEqual(["tool-1"]);
    expect(state.chatStream).toBeNull();
    expect(state.chatRunId).toBeNull();
  });

  it("moves into recovering state when reconnect flow starts", () => {
    const state = realtimeReducer(initialRealtimeState, {
      type: "recover.start",
      reason: "检测到事件序列缺口，正在恢复…",
    });

    expect(state.connectionStatus).toBe("recovering");
    expect(state.lastError).toContain("恢复");
    expect(state.chatLoading).toBe(true);
  });

  it("hydrates messages from chat history after recovery", () => {
    const recovering = realtimeReducer(initialRealtimeState, {
      type: "recover.start",
      reason: "检测到事件序列缺口，正在恢复…",
    });
    const state = realtimeReducer(recovering, {
      type: "history.loaded",
      messages: [
        {
          id: "history-1",
          role: "assistant",
          text: "已从 chat.history 恢复的历史回答",
        },
      ],
    });

    expect(state.connectionStatus).toBe("connected");
    expect(state.chatLoading).toBe(false);
    expect(state.lastError).toBeNull();
    expect(state.chatMessages).toEqual([
      {
        id: "history-1",
        role: "assistant",
        text: "已从 chat.history 恢复的历史回答",
      },
    ]);
  });

  it("keeps active stream visible when session.message arrives during a run", () => {
    let state = realtimeReducer(initialRealtimeState, {
      type: "event",
      frame: {
        type: "event",
        event: "chat",
        seq: 1,
        payload: {
          runId: "run-active",
          sessionKey: "session-1",
          state: "delta",
          message: { text: "正在生成中" },
        },
      },
    });

    state = realtimeReducer(state, {
      type: "event",
      frame: {
        type: "event",
        event: "session.message",
        seq: 2,
        payload: {
          sessionKey: "session-1",
          messageId: "message-1",
        },
      },
    });

    expect(state.chatRunId).toBe("run-active");
    expect(state.chatStream).toBe("正在生成中");
    expect(state.lastSeq).toBe(2);
  });

  it("updates a single tool card across started, streaming, and completed phases", () => {
    let state = realtimeReducer(initialRealtimeState, {
      type: "event",
      frame: {
        type: "event",
        event: "tool.status",
        seq: 1,
        payload: {
          runId: "run-tool",
          sessionKey: "session-1",
          toolCallId: "tool-1",
          name: "feishu.search_docs",
          phase: "started",
          output: "开始搜索",
          startedAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T10:00:00.000Z",
        },
      },
    });

    state = realtimeReducer(state, {
      type: "event",
      frame: {
        type: "event",
        event: "tool.status",
        seq: 2,
        payload: {
          runId: "run-tool",
          sessionKey: "session-1",
          toolCallId: "tool-1",
          name: "feishu.search_docs",
          phase: "streaming",
          output: "已读取 3 篇文档",
          startedAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T10:00:01.000Z",
        },
      },
    });

    state = realtimeReducer(state, {
      type: "event",
      frame: {
        type: "event",
        event: "tool.status",
        seq: 3,
        payload: {
          runId: "run-tool",
          sessionKey: "session-1",
          toolCallId: "tool-1",
          name: "feishu.search_docs",
          phase: "completed",
          output: "最终命中 8 篇文档",
          startedAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T10:00:02.000Z",
        },
      },
    });

    expect(state.toolStreamOrder).toEqual(["tool-1"]);
    expect(state.chatToolMessages).toHaveLength(1);
    expect(state.chatToolMessages[0]).toMatchObject({
      toolCallId: "tool-1",
      phase: "completed",
      output: "最终命中 8 篇文档",
    });
  });
});
