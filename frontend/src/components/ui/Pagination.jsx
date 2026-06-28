import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total } = pagination;

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
      <p className="text-small text-text-muted">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-border text-body text-text-main disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-main transition-colors"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-border text-body text-text-main disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-main transition-colors"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
