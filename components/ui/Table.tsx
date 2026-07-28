import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Belum ada data.",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-soft-gray-dark">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-soft-gray-dark bg-soft-gray">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn("px-4 py-3 font-semibold text-navy", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-soft-gray-dark last:border-0 hover:bg-soft-gray/60"
              >
                {columns.map((col) => (
                  <td key={col.header} className={cn("px-4 py-3 text-navy", col.className)}>
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
