/** Shared Tailwind class strings so every screen uses the same Lovable tokens. */
export const ui = {
  loading: "grid min-h-screen place-items-center text-slate-500 dark:text-slate-400",
  page: "mx-auto w-full max-w-[1280px] px-5 py-8 pb-12 lg:px-10 lg:py-10",
  pageHeader: "mb-10 flex flex-wrap items-end justify-between gap-5",
  crumb: "mb-2.5 text-xs text-slate-500 dark:text-slate-400",
  h1: "font-display text-[28px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50",
  lead: "mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400",
  error:
    "mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300",
  success:
    "mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  empty: "px-5 py-10 text-center text-[13px] text-slate-500 dark:text-slate-400",
  card: "overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200/80 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900",
  panel: "rounded-lg border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900",
  panelHead: "mb-4 flex flex-wrap items-start justify-between gap-3",
  panelTitle: "text-[13.5px] font-semibold tracking-tight text-slate-900 dark:text-slate-50",
  panelText: "mt-0.5 max-w-[40ch] text-[11.5px] text-slate-500 dark:text-slate-400",
  stats: "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3",
  split: "grid grid-cols-1 gap-5 lg:grid-cols-2",
  stat: "relative min-h-[112px] overflow-hidden rounded-lg border border-slate-200/80 bg-white px-5 py-4.5 shadow-card dark:border-slate-700 dark:bg-slate-900",
  statOn:
    "relative min-h-[112px] overflow-hidden rounded-lg border border-primary/40 bg-gradient-to-br from-primary/[0.08] to-transparent px-5 py-4.5 shadow-card dark:border-blue-700 dark:bg-blue-950/40",
  kicker: "text-eyebrow",
  statValue: "tabular mt-2.5 text-[25px] font-bold leading-none text-slate-900 dark:text-slate-50",
  statValueOn: "tabular mt-2.5 text-[25px] font-bold leading-none text-primary",
  row: "flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-1 dark:border-slate-800",
  rowTitle: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  rowMeta: "ml-2 text-[11px] text-slate-500 dark:text-slate-400",
  formCard:
    "mb-6 rounded-lg border border-slate-200/80 bg-white px-5 py-5 shadow-card dark:border-slate-700 dark:bg-slate-900",
  formTitle: "text-[13.5px] font-semibold tracking-tight text-slate-900 dark:text-slate-50",
  formText: "mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400",
  grid2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  field: "mb-4 grid gap-1.5",
  label: "text-[12px] font-medium text-slate-700 dark:text-slate-300",
  control:
    "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none shadow-card transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
  controlMuted:
    "h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-950/70 dark:text-slate-300",
  actions: "mt-2 flex items-center gap-2.5",
  toolbar:
    "flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900",
  search: "relative min-w-[220px] flex-1",
  searchIcon: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",
  searchInput:
    "h-9 w-full rounded-md border border-slate-200 bg-white py-0 pl-9 pr-3 text-[13px] outline-none shadow-card focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
  filter: "flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400",
  select:
    "h-9 min-w-[140px] rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 outline-none shadow-card dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
  table: "w-full min-w-[640px] border-collapse text-[13px]",
  th: "text-eyebrow border-b border-slate-200 bg-white px-4 py-3.5 text-left font-semibold dark:border-slate-700 dark:bg-slate-900",
  td: "border-b border-slate-100/80 px-4 py-3.5 align-middle last:border-b-0 dark:border-slate-800",
  person: "block text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  personSub: "block text-[11px] text-slate-500 dark:text-slate-400",
  desc: "max-w-[420px] whitespace-normal leading-snug text-slate-600 dark:text-slate-300",
  muted: "text-slate-500 dark:text-slate-400",
  cellActions: "flex flex-wrap justify-end gap-1.5",
  footnote:
    "border-t border-slate-100 px-4 py-3 text-xs leading-snug text-slate-500 dark:border-slate-800 dark:text-slate-400",
  link: "font-semibold text-primary hover:text-primary-hover",
  chip:
    "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-500 shadow-card dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300",
  chipSelect:
    "cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-slate-900 outline-none dark:text-slate-100",
} as const;
