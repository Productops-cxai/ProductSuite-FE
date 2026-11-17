const COLORS = ["#2563eb", "#0d9488", "#d97706", "#e11d48", "#7c3aed"];

export function SubjectTrendChart({
  series,
  emptyLabel = "No trend data for this selection.",
}: {
  series: { label: string; points: { date: string; value: number }[] }[];
  emptyLabel?: string;
}) {
  const drawn = series.filter((item) => item.points.length > 0);
  if (!drawn.length) {
    return <p className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  }
  const width = 640;
  const height = 180;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const dates = drawn[0]!.points.map((point) => point.date);
  const max = Math.max(1, ...drawn.flatMap((item) => item.points.map((point) => point.value)));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const xAt = (index: number) =>
    pad.l + (dates.length <= 1 ? innerW / 2 : (index / (dates.length - 1)) * innerW);
  const yAt = (value: number) => pad.t + innerH - (value / max) * innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={width - pad.r}
          y2={pad.t + innerH}
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <text x={4} y={pad.t + 8} className="fill-slate-400 text-[10px]">
          {max}
        </text>
        {drawn.map((item, seriesIndex) => {
          const d = item.points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.value)}`)
            .join(" ");
          return (
            <path
              key={item.label}
              d={d}
              fill="none"
              stroke={COLORS[seriesIndex % COLORS.length]}
              strokeWidth="2"
            />
          );
        })}
        {dates.map((date, index) =>
          dates.length > 12 && index % Math.ceil(dates.length / 6) !== 0 ? null : (
            <text
              key={date}
              x={xAt(index)}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-400 text-[9px]"
            >
              {date.slice(5)}
            </text>
          ),
        )}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {drawn.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
