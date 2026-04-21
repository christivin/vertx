import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createMockProductApiState, type ProductApiState } from "@vertx/api";
import { createInMemoryProductApiRepository, type ProductApiRepository } from "@vertx/domain";

function readState(filePath: string): ProductApiState {
  if (!existsSync(filePath)) {
    return createMockProductApiState();
  }
  return JSON.parse(readFileSync(filePath, "utf-8")) as ProductApiState;
}

function writeState(filePath: string, state: ProductApiState) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
}

export function createFileProductApiRepository(filePath: string): ProductApiRepository {
  const state = readState(filePath);
  const repository = createInMemoryProductApiRepository(state);
  const persist = () => {
    writeState(filePath, state);
  };

  persist();

  return {
    getWorkbenchState: repository.getWorkbenchState,
    listWorkflows: repository.listWorkflows,
    listWorkflowDetails: repository.listWorkflowDetails,
    getWorkflowSummary: repository.getWorkflowSummary,
    getWorkflowDetail: repository.getWorkflowDetail,
    listRuns: repository.listRuns,
    listRunDetails: repository.listRunDetails,
    getRunDetail: repository.getRunDetail,
    listSessions: repository.listSessions,
    listSessionDetails: repository.listSessionDetails,
    getSessionDetail: repository.getSessionDetail,
    listConnections: repository.listConnections,
    getSettings: repository.getSettings,
    listAuditEvents: repository.listAuditEvents,
    setWorkbenchState(workbench) {
      repository.setWorkbenchState(workbench);
      persist();
    },
    prependWorkflow(workflow) {
      repository.prependWorkflow(workflow);
      persist();
    },
    updateWorkflowLastRunAt(workflowId, lastRunAt) {
      repository.updateWorkflowLastRunAt(workflowId, lastRunAt);
      persist();
    },
    prependRun(run) {
      repository.prependRun(run);
      persist();
    },
    upsertRun(run) {
      const result = repository.upsertRun(run);
      persist();
      return result;
    },
    upsertSession(session) {
      const result = repository.upsertSession(session);
      persist();
      return result;
    },
    upsertConnection(connection) {
      const result = repository.upsertConnection(connection);
      persist();
      return result;
    },
    setSettings(settings) {
      repository.setSettings(settings);
      persist();
    },
    listKnowledgeSources: repository.listKnowledgeSources,
    prependKnowledgeSource(knowledgeSource) {
      repository.prependKnowledgeSource(knowledgeSource);
      persist();
    },
    prependAuditEvent(event) {
      repository.prependAuditEvent(event);
      persist();
    },
  };
}
