import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Same variants as Lovable `Btn` in account-payflow-ai/payflow-ui.tsx */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
};

/**
 * Port of Lovable `Btn` — token-based colors (no hardcoded slate/red + dark: fight).
 * Hover stays soft: primary dims slightly, danger gets destructive/10 wash, secondary uses surface-muted.
 */
const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<"primary" | "secondary" | "ghost" | "danger", string> = {
  primary:
    "border border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/92",
  secondary:
    "border border-border bg-card text-fg hover:border-border-strong hover:bg-surface-muted",
  ghost: "border border-transparent bg-transparent font-medium text-fg-muted hover:text-primary",
  danger:
    "border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10",
};

const sizes = {
  md: "h-9 px-3.5",
  sm: "h-8 px-2.5 text-[12px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  const resolved = variant === "danger-outline" ? "danger" : variant;
  return (
    <button type="button" className={cn(base, variants[resolved], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}
