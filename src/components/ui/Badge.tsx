type Props = {
  tone?: "success" | "danger" | "neutral" | "warning";
  children: React.ReactNode;
};

/** Matches Lovable `StatusPill` tone tokens. */
const tones = {
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-amber-300/40 bg-amber-50 text-amber-800",
  neutral: "border-border bg-surface-muted text-fg-muted",
};

const dots = {
  success: "bg-success",
  danger: "bg-destructive",
  warning: "bg-amber-500",
  neutral: "bg-fg-muted/60",
};

export function Badge({ tone = "success", children }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}
