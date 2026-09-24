import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getProduct, listProductAccess, saveProduct } from "../../api/platform";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { titleCaseStatus } from "../../lib/utils";
import type { Product, ProductAccessItem } from "../../types";

export function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const id = Number(productId);

  const [product, setProduct] = useState<Product | null>(null);
  const [entitlements, setEntitlements] = useState<ProductAccessItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "draft",
  });

  async function load() {
    if (!Number.isFinite(id) || id <= 0) {
      setError("Invalid product");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [prod, access] = await Promise.all([
        getProduct(id),
        listProductAccess({ product_id: id }),
      ]);
      setProduct(prod);
      setForm({
        name: prod.name,
        code: prod.code,
        description: prod.description || "",
        status: prod.status,
      });
      setEntitlements(access.filter((row) => row.access_status === "granted"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load product");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function cancelEdit() {
    if (!product) return;
    setEditing(false);
    setForm({
      name: product.name,
      code: product.code,
      description: product.description || "",
      status: product.status,
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError("");
    try {
      const updated = await saveProduct({
        id: product.id,
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
      });
      setProduct(updated);
      setForm({
        name: updated.name,
        code: updated.code,
        description: updated.description || "",
        status: updated.status,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">Loading product…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page">
        {error ? <div className="error-banner">{error}</div> : null}
        <Button variant="secondary" onClick={() => navigate("/platform/products")}>
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/platform">Platform</Link>
            {" / "}
            <Link to="/platform/products">Products</Link>
            {" / "}
            {product.name}
          </div>
          <h1>{product.name}</h1>
          <p>{product.description || "No description provided."}</p>
        </div>
        {editing ? (
          <Button variant="secondary" onClick={cancelEdit}>
            Cancel
          </Button>
        ) : (
          <Button onClick={() => setEditing(true)}>Edit product</Button>
        )}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="product-detail-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Product information</h2>
          </div>

          {editing ? (
            <form onSubmit={onSave}>
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="edit-prod-name">Product name</label>
                  <input
                    id="edit-prod-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-prod-code">Product code</label>
                  <input
                    id="edit-prod-code"
                    value={form.code}
                    readOnly
                    disabled
                    title="Product code cannot be changed"
                    className="input-readonly"
                  />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="edit-prod-status">Status</label>
                <select
                  id="edit-prod-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="edit-prod-desc">Short description</label>
                <textarea
                  id="edit-prod-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What this product does for an organization."
                />
              </div>
              <div className="form-card-actions">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="product-info-fields">
              <div className="form-grid-2">
                <div className="info-field">
                  <span className="info-label">Product Name</span>
                  <strong>{product.name}</strong>
                </div>
                <div className="info-field">
                  <span className="info-label">Product Code</span>
                  <strong className="mono-code">{product.code}</strong>
                </div>
              </div>
              <div className="info-field">
                <span className="info-label">Status</span>
                <Badge tone={product.status === "active" ? "success" : "danger"}>
                  {titleCaseStatus(product.status)}
                </Badge>
              </div>
              <div className="info-field">
                <span className="info-label">Description</span>
                <p className="info-description">
                  {product.description || "No description."}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Entitled organizations</h2>
              <p>
                Entitlement only. Roles, client scope and permissions remain inside the product.
              </p>
            </div>
            <Link to={`/platform/access?product_id=${product.id}`}>
              <Button variant="secondary" size="sm">
                Manage access
              </Button>
            </Link>
          </div>
          {entitlements.length === 0 ? (
            <div className="empty-state compact">No organizations entitled yet.</div>
          ) : (
            <ul className="entitlement-list">
              {entitlements.map((row) => (
                <li key={`${row.organization_id}-${row.product_id}`}>
                  <span>{row.organization_name}</span>
                  <Badge tone="success">Granted</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
