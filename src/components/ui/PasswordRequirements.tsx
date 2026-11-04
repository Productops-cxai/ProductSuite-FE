import { evaluatePasswordRules } from "../../lib/passwordPolicy";

type Props = {
  password: string;
  className?: string;
};

export function PasswordRequirements({ password, className = "" }: Props) {
  const rules = evaluatePasswordRules(password);
  const started = password.length > 0;

  return (
    <ul
      className={`mb-4 space-y-1.5 rounded-md border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/40 ${className}`}
      aria-live="polite"
    >
      {rules.map((rule) => {
        const met = rule.met;
        const tone = !started
          ? "text-slate-500 dark:text-slate-400"
          : met
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-500 dark:text-slate-400";

        return (
          <li key={rule.id} className={`flex items-center gap-2 text-[12px] ${tone}`}>
            <span
              className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                !started
                  ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                  : met
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
              }`}
              aria-hidden
            >
              {started && met ? "✓" : "·"}
            </span>
            <span>{rule.label}</span>
            <span className="sr-only">{met ? "met" : "not met"}</span>
          </li>
        );
      })}
    </ul>
  );
}
