import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { getProduct, listProducts, saveProduct } from "../api/platform";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { titleCaseStatus } from "../lib/utils";
import type { Product } from "../types";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
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

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveProduct({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        status: form.status,
      });
      setRegisterOpen(false);
      setForm({ name: "", code: "", description: "", status: "active" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to register product");
    } finally {
      setSaving(false);
    }
  }

  async function onView(id: number) {
    try {
      setViewProduct(await getProduct(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load product");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>
            Products registered under the platform. PayFlow is the only operational product in this
            phase.
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>Register product</Button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

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
                  <td>{p.code}</td>
                  <td className="desc-cell">{p.description || "—"}</td>
                  <td>
                    <Badge tone={p.status === "active" ? "success" : "danger"}>
                      {titleCaseStatus(p.status)}
                    </Badge>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <Button variant="secondary" size="sm" onClick={() => void onView(p.id)}>
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register product"
        description="Create a product so it can be entitled to organizations and assigned to people."
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="register-product" disabled={saving}>
              {saving ? "Saving…" : "Register"}
            </Button>
          </div>
        }
      >
        <form id="register-product" onSubmit={onRegister}>
          <div className="form-field">
            <label htmlFor="prod-name">Name</label>
            <input
              id="prod-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="prod-code">Code</label>
            <input
              id="prod-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
              placeholder="e.g. PAYFLOW"
            />
          </div>
          <div className="form-field">
            <label htmlFor="prod-desc">Description</label>
            <textarea
              id="prod-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="prod-status">Status</label>
            <select
              id="prod-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        title={viewProduct?.name || "Product"}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setViewProduct(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewProduct ? (
          <div>
            <p>
              <strong>Code:</strong> {viewProduct.code}
            </p>
            <p>
              <strong>Status:</strong> {titleCaseStatus(viewProduct.status)}
            </p>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
              {viewProduct.description || "No description."}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
