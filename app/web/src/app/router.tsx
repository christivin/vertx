import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/widgets/app-shell";
import { AuditPage } from "@/pages/audit";
import { AutomationsPage } from "@/pages/automations";
import { ConnectionsPage } from "@/pages/connections";
import { KnowledgePage } from "@/pages/knowledge";
import { RunDetailPage } from "@/pages/run-detail";
import { SessionDetailPage } from "@/pages/session-detail";
import { SessionsPage } from "@/pages/sessions";
import { SettingsPage } from "@/pages/settings";
import { WorkbenchPage } from "@/pages/workbench";
import { WorkflowDetailPage } from "@/pages/workflow-detail";
import { WorkflowsPage } from "@/pages/workflows";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/workbench" replace /> },
      { path: "workbench", element: <WorkbenchPage /> },
      { path: "workflows", element: <WorkflowsPage /> },
      { path: "workflows/:workflowId", element: <WorkflowDetailPage /> },
      { path: "runs/:runId", element: <RunDetailPage /> },
      { path: "sessions", element: <SessionsPage /> },
      { path: "sessions/:sessionId", element: <SessionDetailPage /> },
      { path: "connections", element: <ConnectionsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      { path: "automations", element: <AutomationsPage /> },
      { path: "audit", element: <AuditPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
