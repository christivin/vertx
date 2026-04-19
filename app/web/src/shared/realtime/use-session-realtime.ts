import { useCallback, useEffect, useReducer, useRef } from "react";
import type { GatewayFrame } from "@vertx/realtime-gateway-contracts";
import { RealtimeGatewayClient } from "./client";
import { mockHelloFrame, mockRealtimeFrames } from "./mock-frames";
import { type ChatMessage, initialRealtimeState, realtimeReducer } from "./state";

const RECOVERY_DELAY_MS = 1200;
const MOCK_FRAME_DELAY_MS = 220;

type UseSessionRealtimeOptions = {
  sessionKey: string;
  gatewayUrl?: string;
  fallbackToMock?: boolean;
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "realtime gateway request failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toHistoryMessages(payload: unknown): ChatMessage[] {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    return [];
  }

  return payload.items.flatMap((item, index): ChatMessage[] => {
    if (!isRecord(item)) {
      return [];
    }
    const role = item.role === "user" ? "user" : "assistant";
    const text =
      typeof item.text === "string"
        ? item.text
        : isRecord(item.message) && typeof item.message.text === "string"
          ? item.message.text
          : "";
    if (!text.trim()) {
      return [];
    }
    return [
      {
        id: typeof item.id === "string" ? item.id : `history:${index}`,
        role,
        text,
      },
    ];
  });
}

export function useSessionRealtime(options: UseSessionRealtimeOptions) {
  const [state, dispatch] = useReducer(realtimeReducer, initialRealtimeState);
  const clientRef = useRef<RealtimeGatewayClient | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const mockTimerRefs = useRef<number[]>([]);
  const closedByUserRef = useRef(false);

  const gatewayUrl = options.gatewayUrl ?? import.meta.env.VITE_VERTX_REALTIME_URL;
  const plane = gatewayUrl ? ("gateway" as const) : ("mock" as const);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearMockTimers = useCallback(() => {
    for (const timerId of mockTimerRefs.current) {
      window.clearTimeout(timerId);
    }
    mockTimerRefs.current = [];
  }, []);

  const handleFrame = useCallback((frame: GatewayFrame) => {
    if (frame.type === "hello") {
      dispatch({ type: "hello", frame });
      return;
    }

    if (frame.type === "event") {
      dispatch({ type: "event", frame });
      return;
    }

    if (frame.type === "error") {
      dispatch({ type: "connect.error", error: frame.message });
    }
  }, []);

  const replayMockFrames = useCallback(() => {
    dispatch({ type: "hello", frame: mockHelloFrame });
    clearMockTimers();
    mockRealtimeFrames.forEach((frame, index) => {
      const timerId = window.setTimeout(() => {
        dispatch({ type: "event", frame });
      }, MOCK_FRAME_DELAY_MS * (index + 1));
      mockTimerRefs.current.push(timerId);
    });
  }, [clearMockTimers]);

  const loadHistory = useCallback(
    async (client: RealtimeGatewayClient, reason?: string) => {
      if (reason) {
        dispatch({ type: "recover.start", reason });
      }
      const history = await client.request("chat.history", {
        sessionKey: options.sessionKey,
        limit: 50,
      });
      const messages = toHistoryMessages(history);
      dispatch({ type: "history.loaded", messages });
    },
    [options.sessionKey],
  );

  const connectGateway = useCallback(() => {
    if (!gatewayUrl) {
      dispatch({ type: "hello", frame: mockHelloFrame });
      return;
    }

    clearReconnectTimer();
    dispatch({ type: "connect.start" });

    const client = new RealtimeGatewayClient({
      url: gatewayUrl,
      onFrame: handleFrame,
      onError: (error) => {
        dispatch({ type: "connect.error", error });
      },
      onGap: () => {
        void loadHistory(client, "检测到事件序列缺口，正在恢复历史消息…").catch((error) => {
          dispatch({ type: "connect.error", error: toErrorMessage(error) });
          client.close();
        });
      },
      onStatusChange: (status) => {
        if (status === "closed" && !closedByUserRef.current) {
          dispatch({ type: "recover.start", reason: "Realtime 连接已断开，正在恢复…" });
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            connectGateway();
          }, RECOVERY_DELAY_MS);
        }
      },
    });

    clientRef.current = client;
    client.connect();
  }, [clearReconnectTimer, gatewayUrl, handleFrame, loadHistory]);

  useEffect(() => {
    closedByUserRef.current = false;
    connectGateway();

    return () => {
      closedByUserRef.current = true;
      clearReconnectTimer();
      clearMockTimers();
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [clearMockTimers, clearReconnectTimer, connectGateway]);

  const submitTask = useCallback(
    async (text: string) => {
      dispatch({ type: "user.queue", text });

      if (!gatewayUrl) {
        replayMockFrames();
        return;
      }

      try {
        const client = clientRef.current;
        if (!client) {
          throw new Error("realtime gateway is not connected");
        }
        await client.request("chat.send", {
          sessionKey: options.sessionKey,
          message: { text },
          deliver: true,
        });
      } catch (error) {
        if (options.fallbackToMock !== false) {
          dispatch({ type: "recover.start", reason: "Gateway 请求失败，已回退到 mock stream。" });
          replayMockFrames();
          return;
        }
        dispatch({ type: "connect.error", error: toErrorMessage(error) });
      }
    },
    [gatewayUrl, options.fallbackToMock, options.sessionKey, replayMockFrames],
  );

  const stopTask = useCallback(() => {
    clearMockTimers();
    const client = clientRef.current;
    if (!client || !state.chatRunId) {
      dispatch({ type: "connect.close" });
      return;
    }

    void client.request("chat.stop", {
      sessionKey: options.sessionKey,
      runId: state.chatRunId,
    }).catch(() => {
      client.close();
    });
  }, [clearMockTimers, options.sessionKey, state.chatRunId]);

  return {
    state,
    plane,
    submitTask,
    stopTask,
    loadHistory: async () => {
      const client = clientRef.current;
      if (!client) {
        throw new Error("realtime gateway is not connected");
      }
      await loadHistory(client);
    },
  };
}
