import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  ["工作台", "/workbench"],
  ["流程", "/workflows"],
  ["会话", "/sessions"],
  ["知识", "/knowledge"],
  ["自动化", "/automations"],
  ["接入管理", "/connections"],
  ["审计", "/audit"],
  ["设置", "/settings"],
] as const;

export function AppShell() {
  return (
    <div className="min-h-screen bg-app-bg text-text-primary">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="w-[220px] shrink-0 border-r border-border-subtle bg-surface-2/90 px-4 py-6 backdrop-blur">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-semibold">
              V
            </div>
            <div>
              <p className="text-lg font-semibold leading-none">Vertx</p>
              <p className="mt-1 text-xs text-text-muted">Workbench v1</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "flex rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-surface-1 text-text-primary shadow-card"
                      : "text-text-secondary hover:bg-surface-1 hover:text-text-primary",
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
