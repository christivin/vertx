import type { GatewayFrame } from "@vertx/realtime-gateway-contracts";

export type RealtimeGatewayClientOptions = {
  url: string;
  onFrame: (frame: GatewayFrame) => void;
  onError?: (error: string) => void;
};

export class RealtimeGatewayClient {
  private socket: WebSocket | null = null;

  constructor(private readonly options: RealtimeGatewayClientOptions) {}

  connect() {
    this.socket = new WebSocket(this.options.url);
    this.socket.addEventListener("message", (event) => {
      const parsed = JSON.parse(String(event.data)) as GatewayFrame;
      this.options.onFrame(parsed);
    });
    this.socket.addEventListener("error", () => {
      this.options.onError?.("realtime gateway connection failed");
    });
  }

  close() {
    this.socket?.close();
    this.socket = null;
  }
}
