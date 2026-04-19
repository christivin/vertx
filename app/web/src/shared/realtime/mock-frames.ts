import type { EventFrame, HelloFrame } from "@vertx/realtime-gateway-contracts";

export const mockHelloFrame: HelloFrame = {
  type: "hello",
  protocol: 1,
  server: { version: "0.1.0" },
  features: { methods: ["chat.send"], events: ["chat", "agent", "tool.status"] },
  snapshot: { workspace: "Vertx Workspace" },
};

export const mockRealtimeFrames: EventFrame[] = [
  {
    type: "event",
    event: "agent",
    seq: 1,
    payload: {
      runId: "run-1",
      seq: 1,
      stream: "正在读取最近 7 天飞书日报，",
      ts: Date.now(),
      sessionKey: "session-1",
      data: {},
    },
  },
  {
    type: "event",
    event: "tool.status",
    seq: 2,
    payload: {
      runId: "run-1",
      sessionKey: "session-1",
      toolCallId: "tool-1",
      name: "feishu.search_docs",
      args: { range: "7d" },
      output: "命中 18 篇日报文档",
      phase: "completed",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    type: "event",
    event: "chat",
    seq: 3,
    payload: {
      runId: "run-1",
      sessionKey: "session-1",
      state: "delta",
      message: { text: "已完成归类，正在生成重点摘要。" },
    },
  },
  {
    type: "event",
    event: "chat",
    seq: 4,
    payload: {
      runId: "run-1",
      sessionKey: "session-1",
      state: "final",
      message: { text: "本周日报显示销售线索增长 18%，但交付问题集中在售后响应超时。" },
    },
  },
];
