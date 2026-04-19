import { useQuery } from "@tanstack/react-query";
import { productApiClient } from "./client";

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

export function useSessionSummaries() {
  return useQuery({
    queryKey: ["session-summaries"],
    queryFn: () => productApiClient.getSessionSummaries(),
  });
}

export function useChannelConnectionSummaries() {
  return useQuery({
    queryKey: ["channel-connection-summaries"],
    queryFn: () => productApiClient.getChannelConnectionSummaries(),
  });
}

export function useSettingsDetail() {
  return useQuery({
    queryKey: ["settings-detail"],
    queryFn: () => productApiClient.getSettingsDetail(),
  });
}

export function useAuditEventSummaries() {
  return useQuery({
    queryKey: ["audit-event-summaries"],
    queryFn: () => productApiClient.getAuditEventSummaries(),
  });
}
