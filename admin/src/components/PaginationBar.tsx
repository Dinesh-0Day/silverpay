import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "../lib/pagination";
import { Button } from "./ui";

type Props = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function PaginationBar({ pagination, onPageChange, className = "" }: Props) {
  const { page, totalPages, total, limit, hasMore } = pagination;
  if (total <= limit && page === 1) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-4 border-t border-slate-100 ${className}`}
    >
      <p className="text-sm text-slate-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} /> Previous
        </Button>
        <span className="text-sm font-medium text-slate-700 px-2 tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
