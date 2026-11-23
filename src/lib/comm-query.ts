/** Shared date bounds for communications list and export. */

export interface CommDateBounds {
  date_from?: string;
  date_to?: string;
  error: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Preset buckets already used by the communications log. "All Dates" sends no bound. */
export function presetDateRangeToParams(date: string): { date_from?: string; date_to?: string } {
  if (date === "All Dates") return {};
  const now = new Date();
  if (date === "Today") {
    return { date_from: startOfDay(now).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  if (date === "Yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { date_from: startOfDay(y).toISOString(), date_to: endOfDay(y).toISOString() };
  }
  if (date === "Last 7 Days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { date_from: startOfDay(from).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  if (date === "This Month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date_from: startOfDay(from).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  return {};
}

function localDateToIso(value: string, end: boolean): string | null {
  const d = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** From date cannot be later than To date. Empty ends are allowed. */
export function dateRangeOrderError(from: string, to: string): string {
  if (from && to && from > to) return "From date cannot be later than To date.";
  return "";
}

/**
 * Combine a preset bucket with an applied From/To range.
 * Both apply (intersection). Local calendar days are sent as ISO datetimes.
 */
export function resolveCommDateBounds(
  preset: { date_from?: string; date_to?: string },
  from: string,
  to: string,
): CommDateBounds {
  const order = dateRangeOrderError(from, to);
  if (order) return { error: order };

  let date_from = preset.date_from;
  let date_to = preset.date_to;

  if (from) {
    const iso = localDateToIso(from, false);
    if (!iso) return { error: "Enter a valid From date." };
    date_from = date_from && date_from > iso ? date_from : iso;
  }
  if (to) {
    const iso = localDateToIso(to, true);
    if (!iso) return { error: "Enter a valid To date." };
    date_to = date_to && date_to < iso ? date_to : iso;
  }
  if (date_from && date_to && date_from > date_to) {
    return { error: "The selected dates do not overlap." };
  }
  return { date_from, date_to, error: "" };
}
