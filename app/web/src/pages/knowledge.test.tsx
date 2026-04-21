import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { KnowledgePage } from "./knowledge";
import { renderWithProviders, waitFor } from "@/test/render";

const mounted: Array<{ unmount: () => Promise<void> }> = [];

afterEach(async () => {
  while (mounted.length > 0) {
    const entry = mounted.pop();
    await entry?.unmount();
  }
});

describe("KnowledgePage", () => {
  it("renders knowledge sources and supports creating a new source", async () => {
    const view = await renderWithProviders(<KnowledgePage />);
    mounted.push(view);

    await waitFor(() => {
      expect(view.container.textContent).toContain("飞书销售知识库");
      expect(view.container.textContent).toContain("创建知识源");
    });

    const nameInput = view.container.querySelector("input") as HTMLInputElement | null;
    const typeSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    expect(nameInput).toBeTruthy();
    expect(typeSelect).toBeTruthy();

    await act(async () => {
      const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      inputSetter?.call(nameInput, "售后排障手册");
      nameInput?.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput?.dispatchEvent(new Event("change", { bubbles: true }));

      const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      selectSetter?.call(typeSelect, "web-upload");
      typeSelect?.dispatchEvent(new Event("input", { bubbles: true }));
      typeSelect?.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });

    const createButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("创建知识源"),
    );
    expect(createButton).toBeTruthy();

    await act(async () => {
      createButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.container.textContent).toContain("售后排障手册");
      expect(view.container.textContent).toContain("web-upload");
    });
  });
});
