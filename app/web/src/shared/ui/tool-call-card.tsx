import { formatDateTime } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/ui/status-badge";

export function ToolCallCard({
  name,
  phase,
  startedAt,
  output,
}: {
  name: string;
  phase: "started" | "streaming" | "completed" | "failed";
  startedAt: string;
  output?: string;
}) {
  const tone =
    phase === "completed" ? "success" : phase === "failed" ? "danger" : phase === "streaming" ? "warning" : "neutral";
  return (
    <div className="rounded-[20px] border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="font-medium">{name}</h4>
          <p className="text-xs text-text-muted">{formatDateTime(startedAt)}</p>
        </div>
        <StatusBadge label={phase} tone={tone} />
      </div>
      {output ? <pre className="overflow-auto rounded-2xl bg-surface-3 p-3 text-xs leading-5 text-text-secondary">{output}</pre> : null}
    </div>
  );
}
