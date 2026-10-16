import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

type Props = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** default ~480 · wide ~560 · xl ~820 for permission grids */
  size?: "default" | "wide" | "xl";
  footer?: ReactNode;
  overlayClassName?: string;
  bodyClassName?: string;
  /** Rendered inline after the title, e.g. an origin pill. */
  titleExtra?: ReactNode;
  showClose?: boolean;
};

export function Modal({
  title,
  description,
  open,
  onClose,
  children,
  wide,
  size,
  footer,
  overlayClassName,
  bodyClassName,
  titleExtra,
  showClose = false,
}: Props) {
  if (!open) return null;

  const resolvedSize = size || (wide ? "wide" : "default");
  const widthClass =
    resolvedSize === "xl"
      ? "max-w-[820px]"
      : resolvedSize === "wide"
        ? "max-w-[560px]"
        : "max-w-[480px]";

  return (
    <div
      className={cn(
        "fixed inset-0 grid place-items-center bg-slate-900/45 p-5",
        overlayClassName || "z-50",
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "flex max-h-[min(90vh,880px)] w-full flex-col rounded-xl bg-white p-[22px] shadow-[0_20px_50px_rgba(15,23,42,0.2)]",
          widthClass,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-1.5 flex shrink-0 items-start justify-between gap-3">
          <h3
            className={cn(
              "flex flex-wrap items-center gap-2 font-display",
              titleExtra || showClose
                ? "text-[1.05rem] font-semibold text-slate-900"
                : "text-[1.15rem] font-bold",
            )}
          >
            {title}
            {titleExtra}
          </h3>
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        {description ? (
          <p className="mb-[18px] shrink-0 text-[12.5px] leading-relaxed text-slate-500">{description}</p>
        ) : null}
        <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
        {footer ?? (
          <div className="mt-2 flex shrink-0 justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
