import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  title: string;
  render: (item: T) => ReactNode;
};

export function DataTable<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border-subtle">
      <table className="w-full border-collapse bg-surface-1 text-left">
        <thead className="bg-surface-3 text-sm text-text-secondary">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border-subtle">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
