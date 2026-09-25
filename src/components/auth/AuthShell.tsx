import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional small label above the form title (Platform Suite screens keep this). */
  eyebrow?: string | null;
  /** Brand tagline under Platform Suite. */
  brandTagline?: string;
  /** Left-panel highlight bullets. Pass empty array to hide. */
  highlights?: string[];
};

const DEFAULT_HIGHLIGHTS = [
  "One login across registered products",
  "Organization entitlement, then people assignment",
  "Roles and permissions stay inside each product",
];

/**
 * Split-screen auth shell aligned to the Lovable PayFlow login craft:
 * DM Sans / Space Grotesk, 1.05fr / 1fr grid, navy hero + white form.
 * Platform Suite keeps its own copy and mark.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  eyebrow = null,
  brandTagline = "Product entitlement & access",
  highlights = DEFAULT_HIGHLIGHTS,
}: Props) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <section className="relative min-h-[42vh] overflow-hidden text-slate-200 lg:min-h-screen">
        <img
          className="absolute inset-0 size-full object-cover object-center"
          src="/assets/payflow-login-visual.jpg"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1c33]/95 via-[#0f1c33]/70 to-[#0f1c33]/30" />
        <div className="relative z-[1] flex h-full max-w-[560px] flex-col justify-between p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <img src="/assets/payflow-mark.png" alt="" className="size-[42px] shrink-0 rounded-lg object-contain" />
            <div>
              <strong className="font-display block text-[1.05rem] font-bold leading-tight tracking-tight text-white">
                Platform Suite
              </strong>
              <span className="block text-[0.72rem] font-medium tracking-wide text-slate-400">
                {brandTagline}
              </span>
            </div>
          </div>

          <div className="my-6">
            <h1 className="font-display mb-3.5 max-w-[16ch] text-[clamp(1.65rem,2.4vw,1.9rem)] font-bold leading-tight tracking-tight text-white">
              {title}
            </h1>
            <p className="mb-[22px] max-w-[42ch] text-[0.95rem] leading-snug text-slate-300">{subtitle}</p>
            {highlights.length > 0 ? (
              <ul className="grid gap-2 text-[0.9rem] text-slate-200">
                {highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="text-[0.8rem] text-slate-400">Prototype environment · illustrative data</div>
        </div>
      </section>

      <section className="grid place-items-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          {eyebrow ? (
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-slate-400">
              {eyebrow}
            </div>
          ) : null}
          {children}
        </div>
      </section>
    </div>
  );
}
