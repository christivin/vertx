export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-[color:rgba(209,65,36,0.2)] bg-[color:rgba(209,65,36,0.06)] px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-[color:var(--color-danger)]">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
    </div>
  );
}
