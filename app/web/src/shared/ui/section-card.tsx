import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function SectionCard({
  title,
  eyebrow,
  actions,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={[
        "rounded-[var(--radius-card)] border border-border-subtle bg-surface-1 px-5 py-5 shadow-card",
        className ?? "",
      ].join(" ")}
    >
      {(title || eyebrow || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? <p className="mb-1 text-xs uppercase tracking-[0.12em] text-text-muted">{eyebrow}</p> : null}
            {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
