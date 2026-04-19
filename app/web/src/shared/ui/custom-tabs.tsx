type TabItem = {
  key: string;
  label: string;
};

export function CustomTabs({
  items,
  activeKey,
  onChange,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-surface-3 p-1">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              "rounded-full px-4 py-2 text-sm transition-colors",
              active ? "bg-surface-1 text-text-primary shadow-card" : "text-text-secondary",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
