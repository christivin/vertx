import { describe, expect, it, vi } from "vitest";
import { ProductApiClient } from "./client";

describe("ProductApiClient", () => {
  it("returns mock data when no base url is configured", async () => {
    const client = new ProductApiClient();

    await expect(client.getWorkbenchSummary()).resolves.toMatchObject({
      pendingApprovals: 2,
      recentRuns: 12,
    });
  });

  it("falls back to mock data when product api fetch fails", async () => {
    const client = new ProductApiClient({
      baseUrl: "https://vertx.example.com",
      fallbackToMock: true,
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });

    await expect(client.getSessionSummaries()).resolves.toHaveLength(2);
  });

  it("returns product api data when fetch succeeds", async () => {
    const client = new ProductApiClient({
      baseUrl: "https://vertx.example.com",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "wf-api", name: "API 流程", status: "active", lastRunAt: "2026-04-20T09:00:00.000Z" }]), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    });

    await expect(client.getWorkflowSummaries()).resolves.toEqual([
      {
        id: "wf-api",
        name: "API 流程",
        status: "active",
        lastRunAt: "2026-04-20T09:00:00.000Z",
      },
    ]);
  });
});
