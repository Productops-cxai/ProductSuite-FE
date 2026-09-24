import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listProducts, saveProduct } from "../../api/platform";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { titleCaseStatus } from "../../lib/utils";
import type { Product } from "../../types";

export function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "draft",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setProducts(await listProducts());
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function closeRegister() {
    setRegisterOpen(false);
    setForm({ name: "", code: "", description: "", status: "draft" });
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await saveProduct({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        status: form.status,
      });
      closeRegister();
      navigate(`/platform/products/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to register product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">Platform / Products</div>
          <h1>Products</h1>
          <p>
            Products registered under the platform. PayFlow is the only operational product in this
            phase.
          </p>
        </div>
        {registerOpen ? (
          <Button variant="secondary" onClick={closeRegister}>
            Cancel
          </Button>
        ) : (
          <Button onClick={() => setRegisterOpen(true)}>Register product</Button>
        )}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {registerOpen ? (
        <section className="form-card">
          <div className="form-card-head">
            <h2>Register product</h2>
            <p>Basic product information only — no plans, pricing or licensing.</p>
          </div>
          <form onSubmit={onRegister}>
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="prod-name">Product name</label>
                <input
                  id="prod-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. PayFlow"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="prod-code">Product code</label>
                <input
                  id="prod-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required
                  placeholder="e.g. PAYFLOW"
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="prod-status">Status</label>
              <select
                id="prod-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="prod-desc">Short description</label>
              <textarea
                id="prod-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this product does for an organization."
              />
            </div>
            <div className="form-card-actions">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save product"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeRegister}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="table-card">
        {loading ? (
          <div className="empty-state">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products registered yet.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>CODE</th>
                <th>DESCRIPTION</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td className="muted-cell">{p.code}</td>
                  <td className="desc-cell">{p.description || "—"}</td>
                  <td>
                    <Badge tone={p.status === "active" ? "success" : "danger"}>
                      {titleCaseStatus(p.status)}
                    </Badge>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <Link to={`/platform/products/${p.id}`}>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
