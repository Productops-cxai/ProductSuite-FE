import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import {
  assignProduct,
  listOrganizations,
  listPeople,
  listProducts,
  removeProduct,
  resendInvite,
  saveOrganization,
  savePerson,
  deletePerson,
} from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { ui } from "../../lib/ui";
import { orgDisplayName } from "../../lib/utils";
import type { Organization, Person, Product } from "../../types";

const NEW_ORG = "__new_org__";

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
  const [pendingDelete, setPendingDelete] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [managingPerson, setManagingPerson] = useState<Person | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization_id: "",
    product_ids: [] as number[],
  });

  // Single mount load — catalogs + people together (cache still dedupes StrictMode remount).
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError("");
      try {
        const [plist, orgs, prods] = await Promise.all([
          listPeople({
            organization_id: orgFilter ? Number(orgFilter) : undefined,
          }),
          listOrganizations(),
          listProducts(),
        ]);
        if (cancelled) return;
        setPeople(plist);
        setOrganizations(orgs);
        setProducts(prods);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load people");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [orgFilter]);

  async function loadPeople(opts?: { search?: string; organization_id?: number }) {
    setLoading(true);
    setError("");
    try {
      const plist = await listPeople({
        search: opts?.search,
        organization_id: opts?.organization_id,
      });
      setPeople(plist);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load people");
    } finally {
      setLoading(false);
    }
  }

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

  useEffect(() => {
    if (!managingPerson) return;
    const next = people.find((p) => p.id === managingPerson.id);
    if (next && next !== managingPerson) setManagingPerson(next);
  }, [people, managingPerson]);

  async function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    await loadPeople({
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
      let organizationId = form.organization_id;
      if (organizationId === NEW_ORG) {
        const name = newOrgName.trim();
        if (!name) {
          setError("Enter the organization name.");
          setSaving(false);
          return;
        }
        const created = await saveOrganization({ name });
        setOrganizations((prev) =>
          [...prev.filter((o) => o.id !== created.id), created].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        organizationId = String(created.id);
      }

      await savePerson({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        organization_id: Number(organizationId),
        product_ids: form.product_ids,
      });
      setAddOpen(false);
      setForm({ full_name: "", email: "", organization_id: "", product_ids: [] });
      setNewOrgName("");
      setInfo("Person invited. Activation email has been sent (logged until SMTP is configured).");
      await loadPeople({
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

  async function onDeletePerson() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    setInfo("");
    try {
      await deletePerson(pendingDelete.id);
      setPendingDelete(null);
      setManagingPerson(null);
      setInfo(`${pendingDelete.full_name} deleted.`);
      await loadPeople({
        search: search.trim() || undefined,
        organization_id: orgFilter ? Number(orgFilter) : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete person");
    } finally {
      setDeleting(false);
    }
  }

  function closeAdd() {
    setAddOpen(false);
    setForm({ full_name: "", email: "", organization_id: "", product_ids: [] });
    setNewOrgName("");
  }

  const addingNewOrg = form.organization_id === NEW_ORG;

  return (
    <div className={ui.page}>
      <PageHeader
        title="People & Product Assignment"
        description="Add a person with their email and organization, then select which products they may open. Assignment controls product entry only — roles, client scope and permissions stay inside each product."
        breadcrumb={[{ label: "Platform", to: "/platform" }, { label: "People" }]}
        actions={
          addOpen ? (
            <Button variant="secondary" onClick={closeAdd}>
              Cancel
            </Button>
          ) : (
            <Button onClick={() => setAddOpen(true)}>Add person</Button>
          )
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}
      {info ? <div className={ui.success}>{info}</div> : null}

      {addOpen ? (
        <section className={ui.formCard}>
          <div className="mb-4">
            <h2 className={ui.formTitle}>New person</h2>
          </div>
          <form onSubmit={(e) => void onAddPerson(e)}>
            <div className={ui.grid2}>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="person-name">
                  Full Name
                </label>
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
                <label className={ui.label} htmlFor="person-email">
                  Work Email
                </label>
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
              <div className={ui.field}>
                <label className={ui.label} htmlFor="person-org">
                  Organization
                </label>
                <select
                  className={ui.control}
                  id="person-org"
                  value={form.organization_id}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({ ...f, organization_id: value }));
                    if (value !== NEW_ORG) setNewOrgName("");
                  }}
                  required
                >
                  <option value="">Select…</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {orgDisplayName(o.name, o.is_internal)}
                    </option>
                  ))}
                  <option value={NEW_ORG}>+ Add a new organization</option>
                </select>
              </div>
              {addingNewOrg ? (
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="new-org-name">
                    New Organization Name
                  </label>
                  <input
                    className={ui.control}
                    id="new-org-name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. Harbour Credit Union"
                    required
                  />
                </div>
              ) : null}
            </div>
            <div className={ui.field}>
              <div className="text-eyebrow mb-2.5">Assign products</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {products.map((p) => {
                  const checked = form.product_ids.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                        checked
                          ? "border-primary/40 bg-primary/[0.06]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        className="mt-0.5 size-4 accent-primary"
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormProduct(p.id)}
                      />
                      <span>
                        <strong className="block text-[13px] font-semibold text-slate-900">{p.name}</strong>
                        <em className="block text-[11px] font-medium not-italic tracking-wide text-slate-500">
                          {p.code}
                        </em>
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
        <form className={ui.toolbar} onSubmit={(e) => void onSearchSubmit(e)}>
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
                  {orgDisplayName(o.name, o.is_internal)}
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
                    <td className={`${ui.td} text-right`}>
                      <Button variant="secondary" size="sm" onClick={() => setManagingPerson(person)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={Boolean(managingPerson)}
        title={managingPerson ? managingPerson.full_name : "Manage person"}
        description={
          managingPerson
            ? `${managingPerson.email} · Assign products they may open, or remove this person.`
            : undefined
        }
        wide
        onClose={() => setManagingPerson(null)}
        footer={
          managingPerson ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
              {managingPerson.role !== "platform_super_admin" && managingPerson.id !== user?.id ? (
                <Button
                  variant="danger"
                  onClick={() => setPendingDelete(managingPerson)}
                >
                  Delete person
                </Button>
              ) : (
                <span />
              )}
              <Button variant="secondary" onClick={() => setManagingPerson(null)}>
                Done
              </Button>
            </div>
          ) : undefined
        }
      >
        {managingPerson ? (
          <div className="space-y-4">
            {managingPerson.status !== "active" ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-[13px] text-amber-800">This person has not activated yet.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyKey === `invite-${managingPerson.id}`}
                  onClick={() => void onResend(managingPerson)}
                >
                  {busyKey === `invite-${managingPerson.id}` ? "Sending…" : "Resend invite"}
                </Button>
              </div>
            ) : null}

            <div>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">
                Product access
              </h4>
              <ul className="grid gap-2">
                {products.map((p) => {
                  const assigned = managingPerson.assigned_products.some((ap) => ap.id === p.id);
                  const busy =
                    busyKey ===
                    (assigned ? `${managingPerson.id}-r-${p.id}` : `${managingPerson.id}-a-${p.id}`);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-slate-50/80 px-3.5 py-3"
                    >
                      <div>
                        <strong className="block text-[13px] font-semibold text-slate-900">{p.name}</strong>
                        <span className="block font-mono text-[11px] tracking-wide text-slate-500">
                          {p.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={assigned ? "success" : "danger"}>
                          {assigned ? "Assigned" : "Not assigned"}
                        </Badge>
                        <Button
                          variant={assigned ? "danger" : "secondary"}
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void (assigned
                              ? onRemove(managingPerson.id, p.id)
                              : onAssign(managingPerson.id, p.id))
                          }
                        >
                          {busy ? "Working…" : assigned ? "Remove" : "Assign"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete ${pendingDelete.full_name}?` : "Delete person?"}
        description="This permanently deletes the person, product assignments, PayFlow membership, and sessions. Email history is kept. The action is logged."
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void onDeletePerson()}
      />
    </div>
  );
}
