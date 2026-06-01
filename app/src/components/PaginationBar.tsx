import type { PaginationMeta } from "../lib/pagination";

type Props = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
};

export default function PaginationBar({ pagination, onPageChange }: Props) {
  const { page, totalPages, total, limit, hasMore } = pagination;
  if (total <= limit && page === 1) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination-bar" aria-label="Pagination">
      <p className="pagination-bar-summary">
        {from}–{to} of {total}
      </p>
      <div className="pagination-bar-actions">
        <button type="button" className="pagination-bar-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="pagination-bar-page">
          {page} / {totalPages}
        </span>
        <button type="button" className="pagination-bar-btn" disabled={!hasMore} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
