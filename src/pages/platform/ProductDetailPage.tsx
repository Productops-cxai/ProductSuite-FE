import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getProduct, listProductAccess, saveProduct } from "../../api/platform";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ui } from "../../lib/ui";
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
      <div className={ui.page}>
        <div className={ui.empty}>Loading product…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={ui.page}>
        {error ? <div className={ui.error}>{error}</div> : null}
        <Button variant="secondary" onClick={() => navigate("/platform/products")}>
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <div className={ui.crumb}>
            <Link to="/platform" className="hover:text-primary">Platform</Link>
            {" / "}
            <Link to="/platform/products" className="hover:text-primary">Products</Link>
            {" / "}
            {product.name}
          </div>
          <h1 className={ui.h1}>{product.name}</h1>
          <p className={ui.lead}>{product.description || "No description provided."}</p>
        </div>
        {editing ? (
          <Button variant="secondary" onClick={cancelEdit}>
            Cancel
          </Button>
        ) : (
          <Button onClick={() => setEditing(true)}>Edit product</Button>
        )}
      </div>

      {error ? <div className={ui.error}>{error}</div> : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className={ui.panel}>
          <div className={ui.panelHead}>
            <h2 className={ui.panelTitle}>Product information</h2>
          </div>

          {editing ? (
            <form onSubmit={onSave}>
              <div className={ui.grid2}>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="edit-prod-name">Product name</label>
                  <input
                    className={ui.control}
                    id="edit-prod-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="edit-prod-code">Product code</label>
                  <input
                    id="edit-prod-code"
                    value={form.code}
                    readOnly
                    disabled
                    title="Product code cannot be changed"
                    className={`${ui.control} cursor-not-allowed bg-slate-50 text-slate-500`}
                  />
                </div>
              </div>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-prod-status">Status</label>
                <select
                  className={ui.control}
                  id="edit-prod-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-prod-desc">Short description</label>
                <textarea
                  className={ui.control}
                  id="edit-prod-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What this product does for an organization."
                />
              </div>
              <div className={ui.actions}>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className={ui.grid2}>
                <div className="grid gap-1.5">
                  <span className="text-[0.72rem] font-bold uppercase tracking-wide text-slate-500">Product Name</span>
                  <strong className="text-[0.98rem] font-semibold">{product.name}</strong>
                </div>
                <div className="grid gap-1.5">
                  <span className="text-[0.72rem] font-bold uppercase tracking-wide text-slate-500">Product Code</span>
                  <strong className="font-mono text-[0.98rem] font-semibold tracking-wide">{product.code}</strong>
                </div>
              </div>
              <div className="grid gap-1.5">
                <span className="text-[0.72rem] font-bold uppercase tracking-wide text-slate-500">Status</span>
                <Badge tone={product.status === "active" ? "success" : "danger"}>
                  {titleCaseStatus(product.status)}
                </Badge>
              </div>
              <div className="grid gap-1.5">
                <span className="text-[0.72rem] font-bold uppercase tracking-wide text-slate-500">Description</span>
                <p className="text-[0.92rem] leading-relaxed text-slate-600">
                  {product.description || "No description."}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className={ui.panel}>
          <div className={ui.panelHead}>
            <div>
              <h2 className={ui.panelTitle}>Entitled organizations</h2>
              <p className={ui.panelText}>
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
            <div className="px-3 py-6 text-center text-slate-500">No organizations entitled yet.</div>
          ) : (
            <ul className="grid gap-2.5">
              {entitlements.map((row) => (
                <li
                  key={`${row.organization_id}-${row.product_id}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-white px-3.5 py-3"
                >
                  <span className="text-[0.92rem] font-semibold">{row.organization_name}</span>
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
