import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listProducts, saveProduct } from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ui } from "../../lib/ui";
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
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
      setError("Product code must start with a letter or digit and use only A–Z, 0–9, _ or -");
      setSaving(false);
      return;
    }
    if (products.some((p) => p.code.toUpperCase() === code)) {
      setError(`Product code '${code}' already exists. Choose a unique code.`);
      setSaving(false);
      return;
    }
    try {
      const created = await saveProduct({
        name: form.name.trim(),
        code,
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
    <div className={ui.page}>
      <PageHeader
        title="Products"
        description="Products registered under the platform. PayFlow is the only operational product in this phase."
        breadcrumb={[{ label: "Platform", to: "/platform" }, { label: "Products" }]}
        actions={
          registerOpen ? (
            <Button variant="secondary" onClick={closeRegister}>
              Cancel
            </Button>
          ) : (
            <Button onClick={() => setRegisterOpen(true)}>Register product</Button>
          )
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}

      {registerOpen ? (
        <section className={ui.formCard}>
          <div className="mb-[18px]">
            <h2 className={ui.formTitle}>Register product</h2>
            <p className={ui.formText}>Basic product information only — no plans, pricing or licensing.</p>
          </div>
          <form onSubmit={onRegister}>
            <div className="mb-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className={ui.label} htmlFor="prod-name">
                  Product name
                </label>
                <input
                  className={ui.control}
                  id="prod-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. PayFlow"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label className={ui.label} htmlFor="prod-code">
                  Product code
                </label>
                <input
                  className={ui.control}
                  id="prod-code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  required
                  minLength={2}
                  maxLength={64}
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                  title="Unique code: letters, digits, underscore or hyphen"
                  placeholder="e.g. PAYFLOW"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-[11px] leading-snug text-slate-500">
                  Unique key — permanent identity, cannot be reused or changed later.
                </p>
              </div>
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="prod-status">Status</label>
              <select
                className={ui.control}
                id="prod-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="prod-desc">Short description</label>
              <textarea
                className={ui.control}
                id="prod-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this product does for an organization."
              />
            </div>
            <div className={ui.actions}>
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

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading products…</div>
        ) : products.length === 0 ? (
          <div className={ui.empty}>No products registered yet.</div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>PRODUCT</th>
                <th className={ui.th}>CODE</th>
                <th className={ui.th}>DESCRIPTION</th>
                <th className={ui.th}>STATUS</th>
                <th className={ui.th} />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className={ui.td}>
                    <strong>{p.name}</strong>
                  </td>
                  <td className={`${ui.td} ${ui.muted}`}>{p.code}</td>
                  <td className={`${ui.td} ${ui.desc}`}>{p.description || "—"}</td>
                  <td className={ui.td}>
                    <Badge tone={p.status === "active" ? "success" : "danger"}>
                      {titleCaseStatus(p.status)}
                    </Badge>
                  </td>
                  <td className={ui.td}>
                    <div className={ui.cellActions}>
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
