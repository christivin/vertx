import { StatusBadge } from "@/shared/ui/status-badge";

export function ConnectionCard({
  name,
  description,
  status,
  actionLabel = "打开配置",
  actionDisabled = false,
  onAction,
}: {
  name: string;
  description: string;
  status: "connected" | "pending" | "offline";
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  const tone = status === "connected" ? "success" : status === "pending" ? "warning" : "danger";
  return (
    <div className="rounded-[24px] border border-border-subtle bg-surface-1 p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        <StatusBadge label={status} tone={tone} />
      </div>
      <button
        type="button"
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={actionDisabled}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}
