import type { GatewayFrame } from "@vertx/realtime-gateway-contracts";

export class SessionAdapter {}

export class RunAdapter {}

export class ChannelAdapter {}

export class AutomationAdapter {}

export class SkillAdapter {}

export class RealtimeBridgeAdapter {
  normalizeFrame(frame: GatewayFrame, workspaceId: string): GatewayFrame {
    if (frame.type !== "event") {
      return frame;
    }
    return {
      ...frame,
      payload: {
        workspaceId,
        ...(typeof frame.payload === "object" && frame.payload ? frame.payload : {}),
      },
    };
  }
}
