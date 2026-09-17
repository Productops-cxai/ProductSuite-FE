import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import {
  grantAccess,
  listOrganizations,
  listProductAccess,
  listProducts,
  revokeAccess,
  saveOrganization,
} from "../api/platform";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Modal } from "../components/ui/Modal";
import type { Organization, Product, ProductAccessItem } from "../types";

export function AccessPage() {
  const [rows, setRows] = useState<ProductAccessItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({ organization_id: "", product_id: "" });
  const [orgForm, setOrgForm] = useState({ name: "", is_internal: false });

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
            Grant or revoke which organizations may use each product. Entitlement is org-level
            only — people still need product assignment to enter.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => setOrgOpen(true)}>
            Add organization
          </Button>
          <Button onClick={() => setGrantOpen(true)}>Grant access</Button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" />
          <input
            placeholder="Search organizations or products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
        </div>
        <select
          className="filter-select"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="granted">Granted</option>
          <option value="revoked">Revoked</option>
        </select>
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="table-card">
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
                <th>STATUS</th>
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
                    <td>
                      {row.product_name}{" "}
                      <span style={{ color: "var(--text-muted)" }}>({row.product_code})</span>
                    </td>
                    <td>
                      <Badge tone={granted ? "success" : "danger"}>
                        {granted ? "Granted" : "Revoked"}
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
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyKey === key}
                            onClick={() => void toggleAccess(row)}
                          >
                            Grant
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
