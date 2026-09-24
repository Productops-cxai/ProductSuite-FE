import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import {
  assignProduct,
  listOrganizations,
  listPeople,
  listProducts,
  removeProduct,
  resendInvite,
  savePerson,
} from "../../api/platform";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";
import { ui } from "../../lib/ui";
import type { Organization, Person, Product } from "../../types";

export function PeoplePage() {
  const { user, refreshMe } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization_id: "",
    product_ids: [] as number[],
  });

  async function load(opts?: { search?: string; organization_id?: number }) {
    setLoading(true);
    setError("");
    try {
      const [plist, orgs, prods] = await Promise.all([
        listPeople({
          search: opts?.search,
          organization_id: opts?.organization_id,
        }),
        listOrganizations(),
        listProducts(),
      ]);
      setPeople(plist);
      setOrganizations(orgs);
      setProducts(prods);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load people");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({
      organization_id: orgFilter ? Number(orgFilter) : undefined,
    });
  }, [orgFilter]);

  const visible = useMemo(() => {
    if (!search.trim()) return people;
    const q = search.trim().toLowerCase();
    return people.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.organization_name.toLowerCase().includes(q),
    );
  }, [people, search]);

  async function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    await load({
      search: search.trim() || undefined,
      organization_id: orgFilter ? Number(orgFilter) : undefined,
    });
  }

  function toggleFormProduct(id: number) {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter((x) => x !== id)
        : [...f.product_ids, id],
    }));
  }

  async function onAddPerson(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      await savePerson({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        organization_id: Number(form.organization_id),
        product_ids: form.product_ids,
      });
      setAddOpen(false);
      setForm({ full_name: "", email: "", organization_id: "", product_ids: [] });
      setInfo("Person invited. Activation email has been sent (logged until SMTP is configured).");
      await load({
        search: search.trim() || undefined,
        organization_id: orgFilter ? Number(orgFilter) : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to add person");
    } finally {
      setSaving(false);
    }
  }

  async function onResend(person: Person) {
    setBusyKey(`invite-${person.id}`);
    setError("");
    setInfo("");
    try {
      await resendInvite(person.id);
      setInfo(`Invite resent to ${person.email}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Resend invite failed");
    } finally {
      setBusyKey("");
    }
  }

  async function onAssign(userId: string, productId: number) {
    const key = `${userId}-a-${productId}`;
    setBusyKey(key);
    setError("");
    try {
      const updated = await assignProduct(userId, productId);
      setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (user?.id === userId) await refreshMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Assign failed");
    } finally {
      setBusyKey("");
    }
  }

  async function onRemove(userId: string, productId: number) {
    const key = `${userId}-r-${productId}`;
    setBusyKey(key);
    setError("");
    try {
      const updated = await removeProduct(userId, productId);
      setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (user?.id === userId) await refreshMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Remove failed");
    } finally {
      setBusyKey("");
    }
  }

  function closeAdd() {
    setAddOpen(false);
    setForm({ full_name: "", email: "", organization_id: "", product_ids: [] });
  }

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <div className={ui.crumb}>Platform / People</div>
          <h1 className={ui.h1}>People &amp; Product Assignment</h1>
          <p className={ui.lead}>
            Add a person with their email and organization, then select which products they may
            open. Assignment controls product entry only — roles, client scope and permissions stay
            inside each product.
          </p>
        </div>
        {addOpen ? (
          <Button variant="secondary" onClick={closeAdd}>
            Cancel
          </Button>
        ) : (
          <Button onClick={() => setAddOpen(true)}>Add person</Button>
        )}
      </div>

      {error ? <div className={ui.error}>{error}</div> : null}
      {info ? <div className={ui.success}>{info}</div> : null}

      {addOpen ? (
        <section className={ui.formCard}>
          <div className="mb-[18px]">
            <h2 className={ui.formTitle}>New person</h2>
          </div>
          <form onSubmit={onAddPerson}>
            <div className={ui.grid2}>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="person-name">Full Name</label>
                <input
                  className={ui.control}
                  id="person-name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. Aisha Rahman"
                  required
                />
              </div>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="person-email">Work Email</label>
                <input
                  className={ui.control}
                  id="person-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="person@company.com"
                  required
                />
              </div>
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="person-org">Organization</label>
              <select
                className={ui.control}
                id="person-org"
                value={form.organization_id}
                onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
                required
              >
                <option value="">Select…</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.is_internal ? " (internal)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.field}>
              <div className="mb-2.5 text-[0.68rem] font-bold tracking-[0.08em] text-slate-500">ASSIGN PRODUCTS</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {products.map((p) => {
                  const checked = form.product_ids.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 ${
                        checked ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        className="size-4 accent-primary"
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormProduct(p.id)}
                      />
                      <span>
                        <strong className="block text-[0.92rem] font-semibold text-slate-900">{p.name}</strong>
                        <em className="block text-[0.72rem] font-semibold not-italic tracking-wide text-slate-500">{p.code}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className={ui.actions}>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add person"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeAdd}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className={ui.card}>
        <form className={ui.toolbar} onSubmit={onSearchSubmit}>
          <div className={ui.search}>
            <span className={ui.searchIcon}>
              <Icon name="search" />
            </span>
            <input
              className={ui.searchInput}
              placeholder="Search people or emails"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className={ui.filter}>
            <span className="font-medium">Organization</span>
            <select
              className={ui.select}
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              aria-label="Organization"
            >
              <option value="">All Organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.is_internal ? " (internal)" : ""}
                </option>
              ))}
            </select>
          </label>
        </form>

        {loading ? (
          <div className={ui.empty}>Loading people…</div>
        ) : visible.length === 0 ? (
          <div className={ui.empty}>No people found.</div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>PERSON</th>
                <th className={ui.th}>ORGANIZATION</th>
                <th className={ui.th}>STATUS</th>
                <th className={ui.th}>ASSIGNED PRODUCTS</th>
                <th className={ui.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((person) => {
                const assignedIds = new Set(person.assigned_products.map((p) => p.id));
                return (
                  <tr key={person.id}>
                    <td className={ui.td}>
                      <div>
                        <strong className={ui.person}>{person.full_name}</strong>
                        <span className={ui.personSub}>{person.email}</span>
                      </div>
                    </td>
                    <td className={ui.td}>{person.organization_name}</td>
                    <td className={ui.td}>
                      <Badge tone={person.status === "active" ? "success" : "danger"}>
                        {person.status}
                      </Badge>
                    </td>
                    <td className={ui.td}>
                      <div className="flex flex-wrap gap-1.5">
                        {person.assigned_products.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          person.assigned_products.map((ap) => (
                            <Badge key={ap.id} tone="success">
                              {ap.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className={ui.td}>
                      <div className={ui.cellActions}>
                        {person.status !== "active" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyKey === `invite-${person.id}`}
                            onClick={() => void onResend(person)}
                          >
                            Resend invite
                          </Button>
                        ) : null}
                        {person.assigned_products.map((ap) => (
                          <Button
                            key={`rm-${ap.id}`}
                            variant="danger-outline"
                            size="sm"
                            disabled={busyKey === `${person.id}-r-${ap.id}`}
                            onClick={() => void onRemove(person.id, ap.id)}
                          >
                            Remove {ap.name}
                          </Button>
                        ))}
                        {products
                          .filter((p) => !assignedIds.has(p.id))
                          .map((p) => (
                            <Button
                              key={`as-${p.id}`}
                              variant="secondary"
                              size="sm"
                              disabled={busyKey === `${person.id}-a-${p.id}`}
                              onClick={() => void onAssign(person.id, p.id)}
                            >
                              Assign {p.name}
                            </Button>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
