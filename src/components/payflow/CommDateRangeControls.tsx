import { Btn } from "./lovable/payflow-ui";

/** Inline From / To dates. Apply commits them; Reset restores the default date state. */
export function CommDateRangeControls({
  from,
  to,
  onFrom,
  onTo,
  showApply,
  showReset,
  onApply,
  onReset,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  showApply: boolean;
  showReset: boolean;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 xl:w-auto xl:flex-row xl:items-center">
      <div className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 shadow-subtle">
        <label className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">From</span>
          <input
            type="date"
            value={from}
            aria-label="From date"
            onChange={(e) => onFrom(e.target.value)}
            className="min-w-0 bg-transparent text-[13px] text-foreground outline-none"
          />
        </label>
        <label className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            aria-label="To date"
            onChange={(e) => onTo(e.target.value)}
            className="min-w-0 bg-transparent text-[13px] text-foreground outline-none"
          />
        </label>
      </div>
      {showApply || showReset ? (
        <div className="flex items-center gap-1.5">
          {showApply ? (
            <Btn variant="primary" className="h-9 px-3" onClick={onApply}>
              Apply
            </Btn>
          ) : null}
          {showReset ? (
            <Btn variant="ghost" className="h-9 px-2.5" onClick={onReset}>
              Reset
            </Btn>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
