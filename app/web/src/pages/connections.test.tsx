import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { ConnectionsPage } from "./connections";
import { renderWithProviders, waitFor } from "@/test/render";

const mounted: Array<{ unmount: () => Promise<void> }> = [];

afterEach(async () => {
  while (mounted.length > 0) {
    const entry = mounted.pop();
    await entry?.unmount();
  }
});

describe("ConnectionsPage", () => {
  it("renders connection summaries and supports feishu connect feedback", async () => {
    const view = await renderWithProviders(<ConnectionsPage />);
    mounted.push(view);

    await waitFor(() => {
      expect(view.container.textContent).toContain("接入管理");
      expect(view.container.textContent).toContain("连接飞书");
      expect(view.container.textContent).toContain("FEISHU");
    });

    const connectButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("连接飞书"),
    );
    expect(connectButton).toBeTruthy();

    await act(async () => {
      connectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).toContain("已完成 FEISHU 连接");
      expect(view.container.textContent).toContain("已连接 1/2");
    });
  });
});
