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
  backTo,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
  /** Optional back link shown as a simple arrow on the left of the title. */
  backTo?: string;
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
        <div className="flex min-w-0 items-start gap-2.5">
          {backTo ? (
            <Link
              to={backTo}
              aria-label="Back"
              className="mt-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 18 9 12l6-6" />
              </svg>
            </Link>
          ) : null}
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
  to,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  tone?: "neutral" | "primary";
  className?: string;
  to?: string;
  onClick?: () => void;
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
        ? "text-red-500"
        : "text-slate-400";

  const body = (
    <>
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] transition-all duration-200",
          tone === "primary" ? "bg-primary" : "bg-transparent group-hover:bg-primary/70",
        )}
      />
      <p className="text-eyebrow transition-colors group-hover:text-primary/80">{label}</p>
      <p
        className={cn(
          "tabular mt-2.5 text-[25px] font-bold leading-none transition-colors",
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
      {hint && !trend ? (
        <p className="mt-2 min-h-4 text-[11px] font-medium text-slate-400 transition-colors group-hover:text-slate-500 dark:group-hover:text-slate-300">
          {hint}
        </p>
      ) : null}
    </>
  );

  const shell = cn(
    "group relative min-h-[112px] overflow-hidden rounded-lg border border-slate-200/80 bg-white px-5 py-4.5 text-left shadow-card transition-all duration-200 dark:border-slate-700 dark:bg-slate-900",
    tone === "primary" &&
      "border-primary/40 bg-gradient-to-br from-primary/[0.08] to-transparent dark:border-blue-700 dark:bg-blue-950/40",
    (to || onClick) &&
      "cursor-pointer hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.04] hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:border-blue-500/50 dark:hover:bg-blue-950/30",
    !(to || onClick) && "hover:border-primary/25",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={shell}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={shell} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
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
          ? "border-primary/40 bg-primary/[0.06] dark:border-blue-500/50 dark:bg-blue-950/40"
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
          applied ? "text-primary dark:text-blue-300" : "text-slate-900 dark:text-slate-100",
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

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

const toneDot: Record<Tone, string> = {
  neutral: "bg-slate-400",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap",
        toneStyles[tone],
      )}
    >
      {dot ? <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[tone])} /> : null}
      {children}
    </span>
  );
}

export function DataTable({
  head,
  children,
  minWidth = 720,
}: {
  head: ReactNode[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200/80 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        <thead className="sticky top-0 z-10">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="border-b border-slate-200 bg-white px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle whitespace-nowrap", className)}>{children}</td>;
}

export function PrimaryCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="leading-tight">
      <span className="block text-[13px] font-semibold text-slate-900 dark:text-slate-100">{title}</span>
      {subtitle ? (
        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</span>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-900/50">
      <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-card transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 dark:border-slate-600 dark:bg-slate-900",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-slate-800 dark:text-slate-200">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 shadow-card outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(controlClass, className)}
    />
  );
}

export function SelectInput({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(controlClass, className)}
    >
      {normalized.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Btn({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:translate-y-px disabled:opacity-50",
        variant === "primary" && "bg-primary text-white shadow-brand hover:bg-primary/92",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
        variant === "ghost" && "font-medium text-slate-500 hover:text-primary",
        variant === "danger" && "border border-red-300 text-red-600 hover:bg-red-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

