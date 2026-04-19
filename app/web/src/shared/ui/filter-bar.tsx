export function FilterBar() {
  return (
    <div className="flex flex-wrap gap-3 rounded-[24px] border border-border-subtle bg-surface-1 p-4 shadow-card">
      <input className="min-w-56 rounded-full bg-surface-3 px-4 py-2 text-sm outline-none" placeholder="搜索流程或任务名" />
      <select className="rounded-full bg-surface-3 px-4 py-2 text-sm outline-none">
        <option>全部状态</option>
        <option>进行中</option>
        <option>已完成</option>
        <option>失败</option>
      </select>
      <select className="rounded-full bg-surface-3 px-4 py-2 text-sm outline-none">
        <option>全部来源</option>
        <option>飞书</option>
        <option>Web</option>
      </select>
    </div>
  );
}
