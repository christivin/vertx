import type { GatewayFrame, RequestFrame, ResponseFrame } from "@vertx/realtime-gateway-contracts";

export type RealtimeGatewayClientStatus = "open" | "closed";

export type RealtimeGatewayClientOptions = {
  url: string;
  onFrame: (frame: GatewayFrame) => void;
  onError?: (error: string) => void;
  onGap?: (info: { expected: number; received: number }) => void;
  onStatusChange?: (status: RealtimeGatewayClientStatus) => void;
};

export class RealtimeGatewayClient {
  private socket: WebSocket | null = null;
  private requestId = 0;
  private lastSeq: number | null = null;
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  constructor(private readonly options: RealtimeGatewayClientOptions) {}

  connect() {
    this.socket = new WebSocket(this.options.url);
    this.socket.addEventListener("open", () => {
      this.options.onStatusChange?.("open");
    });
    this.socket.addEventListener("message", (event) => {
      const parsed = JSON.parse(String(event.data)) as GatewayFrame;
      if (parsed.type === "hello") {
        this.lastSeq = null;
      }
      if (parsed.type === "res") {
        this.resolvePending(parsed);
      }
      if (parsed.type === "error") {
        this.options.onError?.(parsed.message);
      }
      if (parsed.type === "event") {
        if (this.lastSeq !== null && parsed.seq > this.lastSeq + 1) {
          this.options.onGap?.({
            expected: this.lastSeq + 1,
            received: parsed.seq,
          });
        }
        this.lastSeq = parsed.seq;
      }
      this.options.onFrame(parsed);
    });
    this.socket.addEventListener("error", () => {
      this.options.onError?.("realtime gateway connection failed");
    });
    this.socket.addEventListener("close", () => {
      this.rejectPending("realtime gateway connection closed");
      this.options.onStatusChange?.("closed");
    });
  }

  close() {
    this.socket?.close();
    this.socket = null;
    this.lastSeq = null;
  }

  async request(method: string, payload?: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("realtime gateway is not connected");
    }

    const id = `req-${Date.now()}-${++this.requestId}`;
    const frame: RequestFrame = {
      type: "req",
      id,
      method,
      payload,
    };

    const result = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.socket.send(JSON.stringify(frame));
    return result;
  }

  private resolvePending(frame: ResponseFrame) {
    const pending = this.pending.get(frame.id);
    if (!pending) {
      return;
    }
    this.pending.delete(frame.id);
    if (frame.ok) {
      pending.resolve(frame.payload);
      return;
    }
    pending.reject(new Error(frame.error?.message ?? "realtime gateway request failed"));
  }

  private rejectPending(message: string) {
    for (const [id, pending] of this.pending.entries()) {
      pending.reject(new Error(message));
      this.pending.delete(id);
    }
  }
}
