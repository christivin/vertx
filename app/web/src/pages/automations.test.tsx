import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { AutomationsPage } from "./automations";
import { renderWithProviders, waitFor } from "@/test/render";

const mounted: Array<{ unmount: () => Promise<void> }> = [];

afterEach(async () => {
  while (mounted.length > 0) {
    const entry = mounted.pop();
    await entry?.unmount();
  }
});

describe("AutomationsPage", () => {
  it("renders automations and supports create, toggle, and run actions", async () => {
    const view = await renderWithProviders(<AutomationsPage />);
    mounted.push(view);

    await waitFor(() => {
      expect(view.container.textContent).toContain("日报汇总定时任务");
      expect(view.container.textContent).toContain("创建自动化");
    });

    const nameInput = view.container.querySelector("input") as HTMLInputElement | null;
    const triggerSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    expect(nameInput).toBeTruthy();
    expect(triggerSelect).toBeTruthy();

    await act(async () => {
      const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      inputSetter?.call(nameInput, "每周巡检提醒");
      nameInput?.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput?.dispatchEvent(new Event("change", { bubbles: true }));

      const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      selectSetter?.call(triggerSelect, "schedule");
      triggerSelect?.dispatchEvent(new Event("input", { bubbles: true }));
      triggerSelect?.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });

    const createButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("创建自动化"),
    );
    expect(createButton).toBeTruthy();

    await act(async () => {
      createButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).toContain("每周巡检提醒");
    });

    const pauseButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("暂停"),
    );
    expect(pauseButton).toBeTruthy();

    await act(async () => {
      pauseButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).toContain("paused");
    });

    const runButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("立即触发"),
    );
    expect(runButton).toBeTruthy();

    await act(async () => {
      runButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).not.toContain("未运行");
    });
  });
});
