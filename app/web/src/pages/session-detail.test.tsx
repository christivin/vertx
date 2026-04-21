import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { SessionDetailPage } from "./session-detail";
import { flushAsyncWork, renderWithProviders, waitFor } from "@/test/render";

const mounted: Array<{ unmount: () => Promise<void> }> = [];

afterEach(async () => {
  vi.useRealTimers();
  while (mounted.length > 0) {
    const entry = mounted.pop();
    await entry?.unmount();
  }
});

describe("SessionDetailPage", () => {
  it("binds route sessionId and replays mock approval flow in demo mode", async () => {
    const view = await renderWithProviders(<SessionDetailPage />, {
      initialEntries: ["/sessions/session-2"],
      routePath: "/sessions/:sessionId",
    });
    mounted.push(view);

    await flushAsyncWork();

    await waitFor(() => {
      expect(view.container.textContent).toContain("文档总结会话");
      expect(view.container.textContent).toContain("会话 ID");
      expect(view.container.textContent).toContain("session-2");
    });

    vi.useFakeTimers();

    const replayButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("回放示例运行"),
    );
    expect(replayButton).toBeTruthy();

    await act(async () => {
      replayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1400);
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("允许发送飞书回执");
    expect(view.container.textContent).toContain("approvalId: approval-1");
  });
});
