import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  eyebrow?: string;
};

export function AuthShell({ title, subtitle, children, eyebrow = "Platform Suite" }: Props) {
  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden={false}>
        <img
          className="auth-hero-image"
          src="/assets/platform-auth-hero.jpg"
          alt=""
        />
        <div className="auth-hero-overlay" />
        <div className="auth-hero-content">
          <div className="platform-mark">
            <span className="platform-mark-badge">PS</span>
            <div>
              <strong>Platform Suite</strong>
              <span>Product entitlement & access</span>
            </div>
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <ul className="auth-hero-points">
            <li>One login across registered products</li>
            <li>Organization entitlement, then people assignment</li>
            <li>Roles and permissions stay inside each product</li>
          </ul>
          <div className="auth-hero-foot">Prototype environment · illustrative data</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-eyebrow">{eyebrow}</div>
          {children}
        </div>
      </section>
    </div>
  );
}
