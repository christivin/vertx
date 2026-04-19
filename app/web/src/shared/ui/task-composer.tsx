import { useState } from "react";

type TaskComposerProps = {
  onSubmit?: (value: string) => void;
  onStop?: () => void;
  busy?: boolean;
};

export function TaskComposer({ onSubmit, onStop, busy = false }: TaskComposerProps) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-[28px] border border-border-strong bg-surface-2 p-4 shadow-card backdrop-blur">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="描述你的流程目标，例如：整理本周飞书日报并生成复盘结论"
        className="min-h-24 w-full resize-none bg-transparent text-base outline-none placeholder:text-text-muted"
      />
      <div className="mt-4 flex items-center justify-between">
        <button type="button" className="rounded-full border border-border-subtle px-3 py-2 text-sm text-text-secondary">
          附件
        </button>
        <div className="flex gap-2">
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-primary"
            >
              停止
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const next = value.trim();
              if (!next) return;
              onSubmit?.(next);
              setValue("");
            }}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            发起任务
          </button>
        </div>
      </div>
    </div>
  );
}
