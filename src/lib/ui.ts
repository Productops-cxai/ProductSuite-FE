/** Shared Tailwind class strings so every screen uses the same Lovable tokens. */
export const ui = {
  loading: "grid min-h-screen place-items-center text-slate-500 dark:text-slate-400",
  page: "px-8 py-7 pb-10",
  pageHeader: "mb-6 flex items-start justify-between gap-5",
  crumb: "mb-2 text-[0.8rem] text-slate-500 dark:text-slate-400",
  h1: "font-display text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-slate-50",
  lead: "mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-slate-500 dark:text-slate-400",
  error:
    "mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300",
  success:
    "mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  empty: "px-5 py-10 text-center text-slate-500 dark:text-slate-400",
  card: "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900",
  panel: "rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900",
  panelHead: "mb-4 flex items-start justify-between gap-3",
  panelTitle: "font-display text-[1.05rem] font-bold tracking-tight text-slate-900 dark:text-slate-50",
  panelText: "mt-1 max-w-[40ch] text-[0.88rem] leading-snug text-slate-500 dark:text-slate-400",
  stats: "mb-4 grid grid-cols-1 gap-4 md:grid-cols-3",
  split: "grid grid-cols-1 gap-4 lg:grid-cols-2",
  stat: "rounded-xl border border-slate-200 bg-white px-5 py-[18px] shadow-card dark:border-slate-700 dark:bg-slate-900",
  statOn:
    "rounded-xl border border-blue-200 bg-blue-50 px-5 py-[18px] shadow-card dark:border-blue-800 dark:bg-blue-950/40",
  kicker: "mb-2.5 text-[0.72rem] font-bold tracking-[0.06em] text-slate-500 dark:text-slate-400",
  statValue: "font-display text-[1.85rem] font-bold leading-none text-slate-900 dark:text-slate-50",
  statValueOn: "font-display text-[1.85rem] font-bold leading-none text-primary",
  row: "flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-1 dark:border-slate-800",
  rowTitle: "font-semibold text-slate-900 dark:text-slate-100",
  rowMeta: "ml-2 text-[0.85rem] text-slate-500 dark:text-slate-400",
  formCard:
    "mb-[18px] rounded-xl border border-slate-200 bg-white px-6 py-[22px] shadow-card dark:border-slate-700 dark:bg-slate-900",
  formTitle: "font-display text-[1.15rem] font-bold tracking-tight text-slate-900 dark:text-slate-50",
  formText: "mt-1 text-[0.9rem] text-slate-500 dark:text-slate-400",
  grid2: "grid grid-cols-1 gap-3.5 md:grid-cols-2",
  field: "mb-3.5 grid gap-1.5",
  label: "text-sm font-medium text-slate-600 dark:text-slate-300",
  control:
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500",
  controlMuted:
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-950/70 dark:text-slate-300",
  actions: "mt-1 flex items-center gap-2.5",
  toolbar:
    "flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-[18px] py-4 dark:border-slate-700 dark:bg-slate-900",
  search: "relative min-w-[220px] flex-1",
  searchIcon: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",
  searchInput:
    "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
  filter: "flex items-center gap-2 whitespace-nowrap text-[0.85rem] text-slate-500 dark:text-slate-400",
  select:
    "min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
  table: "w-full border-collapse",
  th: "border-b border-slate-200 bg-slate-50 px-[18px] py-3.5 text-left text-[0.72rem] font-bold tracking-[0.06em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400",
  td: "border-b border-slate-100 px-[18px] py-4 align-middle text-[0.92rem] last:border-b-0 dark:border-slate-800",
  person: "block text-slate-900 dark:text-slate-100",
  personSub: "block text-[0.85rem] text-slate-500 dark:text-slate-400",
  desc: "max-w-[420px] leading-snug text-slate-600 dark:text-slate-300",
  muted: "text-slate-500 dark:text-slate-400",
  cellActions: "flex flex-wrap justify-end gap-2",
  footnote:
    "border-t border-slate-100 px-[18px] py-3 text-[0.8rem] leading-snug text-slate-500 dark:border-slate-800 dark:text-slate-400",
  link: "font-semibold text-primary hover:text-primary-hover",
  chip:
    "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.84rem] text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300",
  chipSelect:
    "cursor-pointer border-0 bg-transparent p-0 text-[0.84rem] font-semibold text-slate-900 outline-none dark:text-slate-100",
} as const;
