import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { getOverview } from "../api/platform";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { titleCaseStatus } from "../lib/utils";
import type { OverviewResponse } from "../types";

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
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Platform Overview</h1>
          <p>
            Products registered on the platform and which organizations are entitled to them.
            Product roles, scope and permissions stay inside each product.
          </p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="empty-state">Loading overview…</div> : null}

      {data ? (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="label">REGISTERED PRODUCTS</div>
              <div className="value">{data.registered_products_count}</div>
            </div>
            <div className="stat-card highlight">
              <div className="label">ACTIVE PRODUCTS</div>
              <div className="value">{data.active_products_count}</div>
            </div>
            <div className="stat-card">
              <div className="label">ORGANIZATIONS WITH ACCESS</div>
              <div className="value">{data.organizations_with_access_label}</div>
            </div>
          </div>

          <div className="split-row">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Products</h2>
                  <p>Register a product now so it can be entitled to organizations later.</p>
                </div>
                <Link to="/platform/products">
                  <Button variant="secondary">Manage products</Button>
                </Link>
              </div>
              {data.products_summary.map((p) => (
                <div className="list-row" key={p.id}>
                  <div>
                    <span className="title">{p.name}</span>
                    <span className="meta">{p.code}</span>
                  </div>
                  <Badge tone={p.status === "active" ? "success" : "danger"}>
                    {titleCaseStatus(p.status)}
                  </Badge>
                </div>
              ))}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Product Access</h2>
                  <p>
                    Entitlement only — granting a product does not assign any in-product role or
                    client scope.
                  </p>
                </div>
                <Link to="/platform/access">
                  <Button variant="secondary">Manage access</Button>
                </Link>
              </div>
              {data.org_access_summary.map((org) => (
                <div className="list-row" key={org.id}>
                  <div className="title">{org.name}</div>
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
