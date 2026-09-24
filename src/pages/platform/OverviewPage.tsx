import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getOverview } from "../../api/platform";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ui } from "../../lib/ui";
import { titleCaseStatus } from "../../lib/utils";
import type { OverviewResponse } from "../../types";

export function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getOverview()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Failed to load overview"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h1 className={ui.h1}>Platform Overview</h1>
          <p className={ui.lead}>
            Products registered on the platform and which organizations are entitled to them.
            Product roles, scope and permissions stay inside each product.
          </p>
        </div>
      </div>

      {error ? <div className={ui.error}>{error}</div> : null}
      {loading ? <div className={ui.empty}>Loading overview…</div> : null}

      {data ? (
        <>
          <div className={ui.stats}>
            <div className={ui.stat}>
              <div className={ui.kicker}>REGISTERED PRODUCTS</div>
              <div className={ui.statValue}>{data.registered_products_count}</div>
            </div>
            <div className={ui.statOn}>
              <div className={ui.kicker}>ACTIVE PRODUCTS</div>
              <div className={ui.statValueOn}>{data.active_products_count}</div>
            </div>
            <div className={ui.stat}>
              <div className={ui.kicker}>ORGANIZATIONS WITH ACCESS</div>
              <div className={ui.statValue}>{data.organizations_with_access_label}</div>
            </div>
          </div>

          <div className={ui.split}>
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <div>
                  <h2 className={ui.panelTitle}>Products</h2>
                  <p className={ui.panelText}>Register a product now so it can be entitled to organizations later.</p>
                </div>
                <Link to="/platform/products">
                  <Button variant="secondary">Manage products</Button>
                </Link>
              </div>
              {data.products_summary.map((p) => (
                <div className={ui.row} key={p.id}>
                  <div>
                    <span className={ui.rowTitle}>{p.name}</span>
                    <span className={ui.rowMeta}>· {p.code}</span>
                  </div>
                  <Badge tone={p.status === "active" ? "success" : "danger"}>
                    {titleCaseStatus(p.status)}
                  </Badge>
                </div>
              ))}
            </section>

            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <div>
                  <h2 className={ui.panelTitle}>Product Access</h2>
                  <p className={ui.panelText}>
                    Entitlement only — granting a product does not assign any in-product role or
                    client scope.
                  </p>
                </div>
                <Link to="/platform/access">
                  <Button variant="secondary">Manage access</Button>
                </Link>
              </div>
              {data.org_access_summary.map((org) => (
                <div className={ui.row} key={org.id}>
                  <div className={ui.rowTitle}>{org.name}</div>
                  <Badge tone={org.has_access ? "success" : "danger"}>
                    {org.has_access ? "Has access" : "No access"}
                  </Badge>
                </div>
              ))}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
