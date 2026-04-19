import { jsx as _jsx } from "react/jsx-runtime";
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
        element: _jsx(AppShell, {}),
        children: [
            { index: true, element: _jsx(Navigate, { to: "/workbench", replace: true }) },
            { path: "workbench", element: _jsx(WorkbenchPage, {}) },
            { path: "workflows", element: _jsx(WorkflowsPage, {}) },
            { path: "workflows/:workflowId", element: _jsx(WorkflowDetailPage, {}) },
            { path: "runs/:runId", element: _jsx(RunDetailPage, {}) },
            { path: "sessions", element: _jsx(SessionsPage, {}) },
            { path: "sessions/:sessionId", element: _jsx(SessionDetailPage, {}) },
            { path: "connections", element: _jsx(ConnectionsPage, {}) },
            { path: "settings", element: _jsx(SettingsPage, {}) },
            { path: "knowledge", element: _jsx(KnowledgePage, {}) },
            { path: "automations", element: _jsx(AutomationsPage, {}) },
            { path: "audit", element: _jsx(AuditPage, {}) },
        ],
    },
]);
export function AppRouter() {
    return _jsx(RouterProvider, { router: router });
}
