import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  grantAccess,
  listOrganizations,
  listProductAccess,
  listProducts,
  revokeAccess,
  saveOrganization,
} from "../../api/platform";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import type { Organization, Product, ProductAccessItem } from "../../types";

export function AccessPage() {
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get("product_id") || "";
  const [rows, setRows] = useState<ProductAccessItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>(initialProduct);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({ organization_id: "", product_id: "" });
  const [orgForm, setOrgForm] = useState({ name: "", is_internal: false });

  useEffect(() => {
    const fromQuery = searchParams.get("product_id") || "";
    if (fromQuery && fromQuery !== productFilter) {
      setProductFilter(fromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [access, prods, orgs] = await Promise.all([
        listProductAccess({
          search: search.trim() || undefined,
          product_id: productFilter ? Number(productFilter) : undefined,
          access_status: statusFilter || undefined,
        }),
        listProducts(),
        listOrganizations(),
      ]);
      setRows(access);
      setProducts(prods);
      setOrganizations(orgs);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load product access");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter, statusFilter]);

  const filteredHint = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.organization_name.toLowerCase().includes(q) ||
        r.product_name.toLowerCase().includes(q) ||
        r.product_code.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function toggleAccess(row: ProductAccessItem) {
    const key = `${row.organization_id}-${row.product_id}`;
    setBusyKey(key);
    setError("");
    try {
      if (row.access_status === "granted") {
        await revokeAccess(row.organization_id, row.product_id);
      } else {
        await grantAccess(row.organization_id, row.product_id);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Access update failed");
    } finally {
      setBusyKey("");
    }
  }

  async function onGrant(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await grantAccess(Number(grantForm.organization_id), Number(grantForm.product_id));
      setGrantOpen(false);
      setGrantForm({ organization_id: "", product_id: "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Grant failed");
    }
  }

  async function onCreateOrg(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await saveOrganization({
        name: orgForm.name.trim(),
        is_internal: orgForm.is_internal,
      });
      setOrgOpen(false);
      setOrgForm({ name: "", is_internal: false });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create organization");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">Platform / Product Access</div>
          <h1>Product Access</h1>
          <p>
            Controls which organization is entitled to which product. Granting a product does not
            assign any product role, client or portfolio scope, or functional permission — those stay
            inside the product.
          </p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="table-card">
        <div className="toolbar in-card">
          <div className="search-box">
            <Icon name="search" />
            <input
              placeholder="Search organizations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
          </div>
          <label className="filter-field">
            <span>Product</span>
            <select
              className="filter-select"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              aria-label="Product filter"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Access</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Access status filter"
            >
              <option value="">All Statuses</option>
              <option value="granted">Granted</option>
              <option value="revoked">Revoked</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="empty-state">Loading access…</div>
        ) : filteredHint.length === 0 ? (
          <div className="empty-state">No entitlement rows found.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>ORGANIZATION</th>
                <th>PRODUCT</th>
                <th>ACCESS STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredHint.map((row) => {
                const key = `${row.organization_id}-${row.product_id}`;
                const granted = row.access_status === "granted";
                return (
                  <tr key={key}>
                    <td>
                      <strong>{row.organization_name}</strong>
                    </td>
                    <td className="muted-cell">
                      {row.product_name} · {row.product_code}
                    </td>
                    <td>
                      <Badge tone={granted ? "success" : "danger"}>
                        {granted ? "Access granted" : "Access revoked"}
                      </Badge>
                    </td>
                    <td>
                      <div className="actions-cell">
                        {granted ? (
                          <Button
                            variant="danger-outline"
                            size="sm"
                            disabled={busyKey === key}
                            onClick={() => void toggleAccess(row)}
                          >
                            Revoke access
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={busyKey === key}
                            onClick={() => void toggleAccess(row)}
                          >
                            Grant access
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p className="table-footnote">
          Revoking access disables the organization&apos;s entry into the product. Operational data
          inside the product is retained.{" "}
          <button type="button" className="link-btn" onClick={() => setOrgOpen(true)}>
            Add organization
          </button>
          {" · "}
          <button type="button" className="link-btn" onClick={() => setGrantOpen(true)}>
            Grant access
          </button>
        </p>
      </div>

      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Grant product access"
        description="Allow an organization to use a registered product."
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setGrantOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="grant-access">
              Grant
            </Button>
          </div>
        }
      >
        <form id="grant-access" onSubmit={onGrant}>
          <div className="form-field">
            <label htmlFor="grant-org">Organization</label>
            <select
              id="grant-org"
              value={grantForm.organization_id}
              onChange={(e) => setGrantForm((f) => ({ ...f, organization_id: e.target.value }))}
              required
            >
              <option value="">Select…</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="grant-prod">Product</label>
            <select
              id="grant-prod"
              value={grantForm.product_id}
              onChange={(e) => setGrantForm((f) => ({ ...f, product_id: e.target.value }))}
              required
            >
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={orgOpen}
        onClose={() => setOrgOpen(false)}
        title="Add organization"
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setOrgOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-org">
              Create
            </Button>
          </div>
        }
      >
        <form id="create-org" onSubmit={onCreateOrg}>
          <div className="form-field">
            <label htmlFor="org-name">Name</label>
            <input
              id="org-name"
              value={orgForm.name}
              onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={orgForm.is_internal}
              onChange={(e) => setOrgForm((f) => ({ ...f, is_internal: e.target.checked }))}
            />
            Internal organization
          </label>
        </form>
      </Modal>
    </div>
  );
}
