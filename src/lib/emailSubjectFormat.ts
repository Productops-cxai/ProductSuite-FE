import type { EmailSubjectMetrics } from "../types/emailSubjects";

export function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

/** Rates from the API are fractions of Delivered. `0.425` is 42.5%. */
export function formatRate(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function metricCells(metrics: Partial<EmailSubjectMetrics> | null | undefined) {
  if (!metrics) return [];
  return [
    ["Sent", formatCount(metrics.sent)],
    ["Delivered", formatCount(metrics.delivered)],
    ["Unique opens", `${formatCount(metrics.opens)} · ${formatRate(metrics.open_rate)}`],
    ["Unique clicks", `${formatCount(metrics.clicks)} · ${formatRate(metrics.click_rate)}`],
    ["Payment initiated", formatCount(metrics.initiated)],
    ["Completed payments", formatCount(metrics.completed)],
    ["Conversion", formatRate(metrics.conversion)],
  ] as const;
}
