import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { SettingsPage } from "./settings";
import { renderWithProviders, waitFor } from "@/test/render";

const mounted: Array<{ unmount: () => Promise<void> }> = [];

afterEach(async () => {
  while (mounted.length > 0) {
    const entry = mounted.pop();
    await entry?.unmount();
  }
});

describe("SettingsPage", () => {
  it("allows editing and saving model settings", async () => {
    const view = await renderWithProviders(<SettingsPage />);
    mounted.push(view);

    await waitFor(() => {
      expect(view.container.textContent).toContain("设置");
      expect(view.container.textContent).toContain("模型配置");
    });

    await waitFor(() => {
      const defaultModelInput = view.container.querySelector("input") as HTMLInputElement | null;
      expect(defaultModelInput).toBeTruthy();
      expect(defaultModelInput?.value).toBe("gpt-5.2");
    });

    const defaultModelInput = view.container.querySelector("input") as HTMLInputElement | null;

    await act(async () => {
      if (!defaultModelInput) {
        return;
      }
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(defaultModelInput, "gpt-5.4");
      defaultModelInput.dispatchEvent(new Event("input", { bubbles: true }));
      defaultModelInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).toContain("待保存");
    });

    const saveButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("保存设置"),
    );
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).toContain("已保存");
      expect(view.container.textContent).toContain("默认模型 gpt-5.4");
    });
  });
});
