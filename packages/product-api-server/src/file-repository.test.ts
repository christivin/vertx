import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createProductApiStore } from "@vertx/domain";
import { createFileProductApiRepository } from "./file-repository";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createTempStateFile() {
  const dir = mkdtempSync(join(tmpdir(), "vertx-product-api-"));
  tempDirs.push(dir);
  return join(dir, "state.json");
}

describe("createFileProductApiRepository", () => {
  it("creates a state file and persists domain mutations", () => {
    const stateFile = createTempStateFile();
    const repository = createFileProductApiRepository(stateFile);
    const store = createProductApiStore(repository);

    const workflow = store.createWorkflow({ name: "持久化流程" });
    const run = store.startWorkflowRun(workflow.id);
    store.updateSettings({ defaultModel: "gpt-5.4" });
    store.connectFeishu();

    const persisted = JSON.parse(readFileSync(stateFile, "utf-8")) as {
      workflows: Array<{ id: string; name: string }>;
      runDetails: Array<{ id: string; workflowId: string }>;
      settings: { defaultModel: string };
      connections: Array<{ channelType: string; status: string }>;
      auditEvents: Array<{ action: string }>;
    };

    expect(persisted.workflows[0]).toMatchObject({
      id: workflow.id,
      name: "持久化流程",
    });
    expect(persisted.runDetails[0]).toMatchObject({
      id: run?.id,
      workflowId: workflow.id,
    });
    expect(persisted.settings.defaultModel).toBe("gpt-5.4");
    expect(persisted.connections.find((item) => item.channelType === "feishu")).toMatchObject({
      status: "connected",
    });
    expect(persisted.auditEvents[0]).toMatchObject({
      action: "channel_connection.feishu.connected",
    });
  });

  it("loads existing state from disk", () => {
    const stateFile = createTempStateFile();
    const store = createProductApiStore(createFileProductApiRepository(stateFile));
    const workflow = store.createWorkflow({ name: "重启后仍存在" });

    const reloadedStore = createProductApiStore(createFileProductApiRepository(stateFile));

    expect(reloadedStore.getWorkflowDetail(workflow.id)).toMatchObject({
      name: "重启后仍存在",
    });
  });
});
