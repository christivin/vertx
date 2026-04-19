import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productApiClient, type CreateWorkflowInput, type UpdateSettingsInput } from "./client";

export function useWorkbenchSummary() {
  return useQuery({
    queryKey: ["workbench-summary"],
    queryFn: () => productApiClient.getWorkbenchSummary(),
  });
}

export function useWorkflowSummaries() {
  return useQuery({
    queryKey: ["workflow-summaries"],
    queryFn: () => productApiClient.getWorkflowSummaries(),
  });
}

export function useWorkflowDetail(workflowId: string) {
  return useQuery({
    queryKey: ["workflow-detail", workflowId],
    queryFn: () => productApiClient.getWorkflowDetail(workflowId),
    enabled: Boolean(workflowId),
  });
}

export function useCreateWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowInput) => productApiClient.createWorkflow(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflow-summaries"] });
    },
  });
}

export function useStartWorkflowRunMutation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => productApiClient.startWorkflowRun(workflowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflow-run-summaries"] });
      void queryClient.invalidateQueries({ queryKey: ["workflow-detail", workflowId] });
      void queryClient.invalidateQueries({ queryKey: ["workbench-summary"] });
    },
  });
}

export function useWorkflowRunSummaries() {
  return useQuery({
    queryKey: ["workflow-run-summaries"],
    queryFn: () => productApiClient.getWorkflowRunSummaries(),
  });
}

export function useWorkflowRunDetail(runId: string) {
  return useQuery({
    queryKey: ["workflow-run-detail", runId],
    queryFn: () => productApiClient.getWorkflowRunDetail(runId),
    enabled: Boolean(runId),
  });
}

export function useRetryWorkflowRunMutation(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => productApiClient.retryWorkflowRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflow-run-summaries"] });
      void queryClient.invalidateQueries({ queryKey: ["workflow-run-detail", runId] });
      void queryClient.invalidateQueries({ queryKey: ["workbench-summary"] });
    },
  });
}

export function useSessionSummaries() {
  return useQuery({
    queryKey: ["session-summaries"],
    queryFn: () => productApiClient.getSessionSummaries(),
  });
}

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: () => productApiClient.getSessionDetail(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useChannelConnectionSummaries() {
  return useQuery({
    queryKey: ["channel-connection-summaries"],
    queryFn: () => productApiClient.getChannelConnectionSummaries(),
  });
}

export function useConnectFeishuMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => productApiClient.connectFeishu(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channel-connection-summaries"] });
      void queryClient.invalidateQueries({ queryKey: ["workbench-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-event-summaries"] });
    },
  });
}

export function useSettingsDetail() {
  return useQuery({
    queryKey: ["settings-detail"],
    queryFn: () => productApiClient.getSettingsDetail(),
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => productApiClient.updateSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings-detail"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-event-summaries"] });
    },
  });
}

export function useAuditEventSummaries() {
  return useQuery({
    queryKey: ["audit-event-summaries"],
    queryFn: () => productApiClient.getAuditEventSummaries(),
  });
}
