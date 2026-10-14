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
        <h3 className="font-display mb-1.5 shrink-0 text-[1.15rem] font-bold">{title}</h3>
        {description ? (
          <p className="mb-[18px] shrink-0 text-[0.9rem] text-slate-500">{description}</p>
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
