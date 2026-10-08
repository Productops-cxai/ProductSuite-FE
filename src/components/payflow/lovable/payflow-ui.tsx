import { Link } from "react-router-dom";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <span className="opacity-40">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="grid grid-cols-1 items-end gap-3 pb-2 md:grid-cols-[minmax(0,1fr)_auto] md:gap-5">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-tight font-semibold text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
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
  description?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden transition-[border-color,box-shadow] duration-200", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-5 py-4.5">
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-tight text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cn(title ? "px-5 py-4" : "px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  tone?: "neutral" | "primary";
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div
      className={cn(
         "group relative min-h-[112px] overflow-hidden rounded-lg border border-border/55 bg-card px-5 py-4.5 shadow-subtle transition-all duration-200 hover:border-primary/25 hover:shadow-panel",
        tone === "primary" && "border-primary/40 bg-gradient-to-br from-primary/[0.08] to-transparent shadow-brand",
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
           "tabular mt-2.5 text-[25px] leading-none font-bold",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      {trend && (
        <p className={cn("mt-2 text-[11px] font-medium", trendColor)}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.text}
        </p>
      )}
      {hint && !trend && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const toneStyles = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  info: "bg-info/15 text-info border-info/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  ai: "bg-ai/15 text-ai border-ai/30",
} as const;

const toneDot = {
  neutral: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
  ai: "bg-ai",
} as const;

export type Tone = keyof typeof toneStyles;

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
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[tone])} />}
      {children}
    </span>
  );
}

/** Subtle loading placeholder used while a view settles. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("skeleton block h-4 w-full", className)} />;
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "Active":
      return "info";
    case "Promise to Pay":
      return "warning";
    case "Payment Plan":
      return "neutral";
    case "Human Review":
      return "danger";
    case "Resolved":
      return "success";
    default:
      return "neutral";
  }
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
    <div className="panel max-h-[70vh] overflow-auto">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        <thead className="sticky top-0 z-10">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                 className="text-eyebrow border-b border-border-strong/70 bg-card px-4 py-3 text-left font-semibold whitespace-nowrap"
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
  className?: string | undefined;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
         "border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 align-middle whitespace-nowrap", className)}>{children}</td>
  );
}

export function PrimaryCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="leading-tight">
      <span className="block text-[13px] font-semibold text-foreground">{title}</span>
      {subtitle && (
        <span className="tabular mt-0.5 block text-[11px] text-muted-foreground">{subtitle}</span>
      )}
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
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong/60 bg-muted/30 px-6 py-12 text-center">
      <span className="mb-2.5 flex size-8 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
        <InboxIcon className="size-4" />
      </span>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
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
  placeholder?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
         "flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 shadow-subtle transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/10",
        className,
      )}
    >
      <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  // A filter left on its first / "All …" option reads as unset and stays quiet;
  // an applied filter picks up a subtle PayFlow Blue emphasis.
  const applied = value !== options[0] && !value.startsWith("All ");
  return (
    <label
      className={cn(
         "flex h-9 items-center gap-2 rounded-md border px-3 shadow-subtle transition-all",
        applied
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-border bg-card hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "text-[11px] font-medium",
          applied ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "bg-transparent text-[13px] font-medium outline-none",
          applied ? "text-primary" : "text-foreground",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option} className="text-foreground">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Multi-select filter. An empty selection reads as "all" and stays quiet; any
 * selection picks up the same subtle emphasis as an applied FilterSelect.
 */
export function FilterMultiSelect({
  label,
  allLabel,
  selected,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  selected: string[];
  options: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const applied = selected.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? selected[0]!
        : `${selected.length} selected`;

  const toggle = (option: string) => {
    onChange(
      selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option],
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border px-3 shadow-subtle transition-all",
          applied
            ? "border-primary/40 bg-primary/[0.06]"
            : "border-border bg-card hover:border-border-strong",
        )}
      >
        <span
          className={cn(
            "text-[11px] font-medium",
            applied ? "text-primary" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "max-w-[180px] truncate text-[13px] font-medium",
            applied ? "text-primary" : "text-foreground",
          )}
        >
          {summary}
        </span>
        <ChevronDownIcon className={cn("size-3.5", applied ? "text-primary" : "text-muted-foreground")} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 min-w-[220px] rounded-md border border-border bg-popover p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[12.5px] text-muted-foreground hover:bg-accent"
          >
            {allLabel}
            {selected.length === 0 && <CheckIcon className="size-3.5 text-primary" />}
          </button>
          <div className="my-1 h-px bg-border" />
          {options.map((option) => {
            const on = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className="flex w-full items-center justify-between gap-3 rounded px-2.5 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent"
              >
                <span className="truncate">{option}</span>
                {on && <CheckIcon className="size-3.5 shrink-0 text-primary" />}
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="px-2.5 py-1.5 text-[12px] text-muted-foreground">
              No sub-clients available
            </p>
          )}
        </div>
      )}
    </div>
  );
}


export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  className?: string | undefined;
}) {
  return (
    <div className={cn("mb-5 flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors",
            active === t
              ? "border-primary font-semibold text-primary"
              : "border-transparent font-medium text-muted-foreground hover:border-border-strong hover:text-foreground",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function PlaceholderSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <Panel title={title} description={description}>
      <div className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-10 text-center">
        <p className="text-[13px] font-medium text-foreground">Coming in a later step</p>
        {items && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {items.map((item) => (
              <StatusPill key={item}>{item}</StatusPill>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const controlClass =
   "h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground shadow-subtle outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:opacity-60";

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(controlClass, className)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  rows?: number | undefined;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:opacity-60"
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
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(controlClass, className)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** Searchable single-select dropdown (type to filter options). */
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Search…",
  disabled,
  emptyLabel = "No matches",
  className,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 4;
      const menuMax = 320;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceBelow < Math.min(menuMax, 240) && rect.top > spaceBelow;
      const next: CSSProperties = {
        position: "fixed",
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: rect.width,
        zIndex: 80,
        maxHeight: openUp
          ? Math.min(menuMax, Math.max(160, rect.top - gap - 8))
          : Math.min(menuMax, Math.max(160, spaceBelow - 8)),
      };
      if (openUp) next.bottom = window.innerHeight - rect.top + gap;
      else next.top = rect.bottom + gap;
      setMenuStyle(next);
    };

    place();
    window.addEventListener("resize", place);
    // Capture scroll from nested panels / layout.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const menu =
    open && !disabled ? (
      <div
        ref={menuRef}
        style={menuStyle}
        className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-panel"
      >
        <div className="shrink-0 border-b border-border p-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] outline-none focus:border-primary"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">{emptyLabel}</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-[13px] hover:bg-accent",
                    opt === value && "bg-accent/60 font-medium text-primary",
                  )}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          controlClass,
          "flex items-center justify-between gap-2 text-left",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate">{value || (options.length ? placeholder : emptyLabel)}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{open ? "▴" : "▾"}</span>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

export function ChoiceCard({
  title,
  description,
  selected,
  disabled,
  badge,
  onSelect,
}: {
  title: string;
  description: string;
  selected?: boolean;
  disabled?: boolean | undefined;
  badge?: string | undefined;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "rounded-lg border bg-card p-4 text-left transition-all",
        selected
          ? "border-primary bg-accent/40 ring-1 ring-primary/25"
          : "border-border hover:border-border-strong hover:shadow-subtle",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        {badge && <StatusPill>{badge}</StatusPill>}
        {selected && !badge && <StatusPill tone="info">Selected</StatusPill>}
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  disabled,
  badge,
  onChange,
}: {
  label: string;
  description?: string | undefined;
  checked: boolean;
  disabled?: boolean | undefined;
  badge?: string | undefined;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          {badge && <StatusPill>{badge}</StatusPill>}
        </div>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-primary bg-primary"
            : "border-border-strong bg-muted-foreground/35",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
         "inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:translate-y-px disabled:opacity-50",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-brand hover:bg-primary/92 active:translate-y-px",
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:border-border-strong hover:bg-surface",
        variant === "ghost" && "font-medium text-muted-foreground hover:text-primary",
        variant === "danger" &&
          "border border-destructive/30 text-destructive hover:bg-destructive/10",
        className,
      )}
    >
      {children}
    </button>
  );
}
