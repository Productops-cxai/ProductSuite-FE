import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Shared PayFlow / Platform presentation primitives (Lovable payflow-ui subset).
 * Use these instead of copying typography/spacing class strings into pages.
 */

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-10">
      {breadcrumb ? (
        <nav className="mb-2.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 ? <span className="opacity-40">/</span> : null}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-slate-800 dark:hover:text-slate-200">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-800 dark:text-slate-200">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-5 pb-2 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "mb-5 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4.5 dark:border-slate-800">
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  tone?: "neutral" | "primary";
  className?: string;
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
        ? "text-red-500"
        : "text-slate-400";

  return (
    <div
      className={cn(
        "group relative min-h-[112px] overflow-hidden rounded-lg border border-slate-200/80 bg-white px-5 py-4.5 shadow-card transition-all duration-200 hover:border-primary/25 dark:border-slate-700 dark:bg-slate-900",
        tone === "primary" &&
          "border-primary/40 bg-gradient-to-br from-primary/[0.08] to-transparent dark:border-blue-700 dark:bg-blue-950/40",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          tone === "primary" ? "bg-primary" : "bg-transparent",
        )}
      />
      <p className="text-eyebrow">{label}</p>
      <p
        className={cn(
          "tabular mt-2.5 text-[25px] font-bold leading-none",
          tone === "primary" ? "text-primary" : "text-slate-900 dark:text-slate-50",
        )}
      >
        {value}
      </p>
      {trend ? (
        <p className={cn("mt-2 text-[11px] font-medium", trendColor)}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.text}
        </p>
      ) : null}
      {hint && !trend ? <p className="mt-2 min-h-4 text-[11px] font-medium text-slate-400">{hint}</p> : null}
    </div>
  );
}

/** Compact labeled select used on dashboard / list filter bars. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  defaultValue,
  "aria-label": ariaLabel,
}: {
  label: string;
  value?: string;
  defaultValue?: string;
  options: { value: string; label: string }[] | string[];
  onChange?: (value: string) => void;
  "aria-label"?: string;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const first = normalized[0]?.value ?? "";
  const applied =
    (value ?? defaultValue ?? first) !== first &&
    !(value ?? defaultValue ?? "").toString().startsWith("All ");

  return (
    <label
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border px-3 shadow-card transition-all",
        applied
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900",
      )}
    >
      <span
        className={cn(
          "text-[11px] font-medium",
          applied ? "text-primary" : "text-slate-500 dark:text-slate-400",
        )}
      >
        {label}
      </span>
      <select
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-label={ariaLabel || label}
        className={cn(
          "bg-transparent text-[13px] font-medium outline-none",
          applied ? "text-primary" : "text-slate-900 dark:text-slate-100",
        )}
      >
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
