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
});
