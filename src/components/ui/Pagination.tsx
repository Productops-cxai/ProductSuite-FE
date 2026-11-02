import { cn } from "../../lib/utils";

type OffsetProps = {
  mode?: "offset";
  total: number;
  offset: number;
  pageSize: number;
  rowCount: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
  disabled?: boolean;
};

type PageProps = {
  mode: "page";
  total: number;
  page: number;
  pageSize: number;
  rowCount: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
  disabled?: boolean;
};

export type PaginationProps = OffsetProps | PageProps;

function pagerBtnClass(disabled: boolean) {
  return cn(
    "inline-flex h-9 items-center rounded-md border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors",
    disabled
      ? "cursor-not-allowed opacity-50"
      : "hover:border-border-strong hover:bg-surface",
  );
}

/** Shared list pager — matches Comms “Showing X–Y of total” + Previous/Next. */
export function Pagination(props: PaginationProps) {
  const { total, pageSize, rowCount, onPrevious, onNext, className, disabled } = props;
  const offset =
    props.mode === "page" ? Math.max(0, (props.page - 1) * pageSize) : props.offset;
  const pageStart = total === 0 || rowCount === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rowCount, total);
  const canPrev = !disabled && offset > 0;
  const canNext = !disabled && offset + pageSize < total;

  if (total <= 0 && rowCount <= 0) return null;

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3",
        className,
      )}
    >
      <p className="text-[12px] text-muted-foreground">
        {total === 0
          ? "No results"
          : `Showing ${pageStart}–${pageEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={pagerBtnClass(!canPrev)}
          disabled={!canPrev}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className={pagerBtnClass(!canNext)}
          disabled={!canNext}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
