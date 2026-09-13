import type { ReactNode } from "react";

const SKELETON_BAR_WIDTHS = ["w-28", "w-20", "w-24", "w-16", "w-20"] as const;

function skeletonBarClass(columnIndex: number, columnCount: number): string {
  if (columnIndex === columnCount - 1) return "w-10";
  return SKELETON_BAR_WIDTHS[columnIndex % SKELETON_BAR_WIDTHS.length];
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header || "col"}-${index}`}
                className="px-3 py-2 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** Pulse placeholders matching AdminTable chrome — no decorative SVG. */
export function AdminTableSkeleton({
  headers,
  rows = 6,
  label,
  testId,
}: {
  headers: string[];
  rows?: number;
  label: string;
  testId?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid={testId}
    >
      <p className="sr-only">{label}</p>
      <AdminTable headers={headers}>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {headers.map((header, column) => (
              <td key={`${header || "col"}-${column}`} className="px-3 py-2.5">
                <div
                  className={`h-3.5 animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${skeletonBarClass(column, headers.length)}`}
                />
              </td>
            ))}
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
