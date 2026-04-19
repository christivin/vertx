import type {
  EventFrame,
  GatewayEventName,
  GatewayFrame,
  HelloFrame,
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
};

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
