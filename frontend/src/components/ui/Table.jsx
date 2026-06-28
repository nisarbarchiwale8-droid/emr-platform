import { clsx } from 'clsx';
import { Inbox } from 'lucide-react';

/**
 * Generic data table following the design system.
 * columns: [{ key, header, render?, className? }]
 */
export function Table({ columns, data, loading, emptyMessage = 'No records found', onRowClick }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-main rounded-[10px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Inbox size={40} className="mb-3 opacity-40" />
        <p className="text-body">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className={clsx('py-3 px-4 text-small font-semibold text-text-muted uppercase tracking-wide', col.headerClassName)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={clsx(
                'border-b border-border last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-bg-main'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={clsx('py-3 px-4 text-body text-text-main', col.className)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
