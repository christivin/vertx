import { StatusBadge } from "@/shared/ui/status-badge";

export type TimelineItem = {
  title: string;
  description: string;
  tone?: "success" | "warning" | "danger" | "neutral";
};

export function RunTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.title} className="rounded-[20px] border border-border-subtle bg-surface-1 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-medium">{item.title}</p>
            <StatusBadge label={item.tone ?? "neutral"} tone={item.tone ?? "neutral"} />
          </div>
          <p className="text-sm text-text-secondary">{item.description}</p>
        </li>
      ))}
    </ol>
  );
}
