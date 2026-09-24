import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional small label above the form title (Platform Suite screens keep this). */
  eyebrow?: string | null;
};

/**
 * Split-screen auth shell aligned to the Lovable PayFlow login craft:
 * DM Sans / Space Grotesk, 1.05fr / 1fr grid, navy hero + white form.
 * Platform Suite keeps its own copy and mark.
 */
export function AuthShell({ title, subtitle, children, eyebrow = null }: Props) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <img className="auth-hero-image" src="/assets/payflow-login-visual.jpg" alt="" />
        <div className="auth-hero-overlay" />
        <div className="auth-hero-content">
          <div className="platform-mark">
            <img src="/assets/payflow-mark.png" alt="" className="platform-mark-img" />
            <div>
              <strong>Platform Suite</strong>
              <span>Product entitlement &amp; access</span>
            </div>
          </div>

          <div className="auth-hero-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <ul className="auth-hero-points">
              <li>One login across registered products</li>
              <li>Organization entitlement, then people assignment</li>
              <li>Roles and permissions stay inside each product</li>
            </ul>
          </div>

          <div className="auth-hero-foot">Prototype environment · illustrative data</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          {eyebrow ? <div className="auth-card-eyebrow">{eyebrow}</div> : null}
          {children}
        </div>
      </section>
    </div>
  );
}
