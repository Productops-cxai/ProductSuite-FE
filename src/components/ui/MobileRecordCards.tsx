import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

/** Stacked card rows for narrow viewports — use instead of wide DataTable on mobile. */
export function MobileRecordCards({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function MobileRecordCard({
  to,
  onClick,
  title,
  subtitle,
  meta,
  badges,
  footer,
  className,
}: {
  to?: string;
  onClick?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const main = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {badges ? <div className="flex shrink-0 flex-wrap justify-end gap-1">{badges}</div> : null}
    </div>
  );

  return (
    <div
      role={onClick && !to ? "button" : undefined}
      tabIndex={onClick && !to ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick && !to
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-lg border border-border bg-card px-3.5 py-3 shadow-subtle",
        (to || onClick) && "transition-colors hover:border-border-strong hover:bg-surface/60",
        onClick && !to && "cursor-pointer text-left",
        className,
      )}
    >
      {to ? (
        <Link
          to={to}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {main}
          {meta ? <div className="mt-2 text-[12px] text-muted-foreground">{meta}</div> : null}
        </Link>
      ) : (
        <>
          {main}
          {meta ? <div className="mt-2 text-[12px] text-muted-foreground">{meta}</div> : null}
        </>
      )}
      {footer ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{footer}</div> : null}
    </div>
  );
}
