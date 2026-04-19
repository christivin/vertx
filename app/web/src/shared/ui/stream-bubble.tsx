export function StreamBubble({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <div className="rounded-[22px] bg-surface-2 px-4 py-3">
      <p className="whitespace-pre-wrap text-sm leading-6">
        {text}
        {active ? <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded bg-accent align-middle" /> : null}
      </p>
    </div>
  );
}
