export type Workflow = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  status: "queued" | "running" | "completed" | "failed";
};

export type ChannelConnection = {
  id: string;
  channelType: string;
  status: "connected" | "offline" | "pending";
};
