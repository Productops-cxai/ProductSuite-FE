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
import { Modal } from "../../components/ui/Modal";
import type { Organization, Person, Product } from "../../types";

export function PeoplePage() {
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
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Remove failed");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">Platform / People</div>
          <h1>People &amp; Product Assignment</h1>
          <p>
            Add a person with their email and organization, then select which products they may
            open. Assignment controls product entry only — roles, client scope and permissions stay
            inside each product.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add person</Button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {info ? <div className="success-banner">{info}</div> : null}

      <form className="toolbar" onSubmit={onSearchSubmit}>
        <div className="search-box">
          <Icon name="search" />
          <input
            placeholder="Search people or emails"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          aria-label="Organization"
        >
          <option value="">Organization: All Organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.is_internal ? " (internal)" : ""}
            </option>
          ))}
        </select>
      </form>

      <div className="table-card">
        {loading ? (
          <div className="empty-state">Loading people…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No people found.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>PERSON</th>
                <th>ORGANIZATION</th>
                <th>STATUS</th>
                <th>ASSIGNED PRODUCTS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((person) => {
                const assignedIds = new Set(person.assigned_products.map((p) => p.id));
                return (
                  <tr key={person.id}>
                    <td>
                      <div className="person-cell">
                        <strong>{person.full_name}</strong>
                        <span>{person.email}</span>
                      </div>
                    </td>
                    <td>{person.organization_name}</td>
                    <td>
                      <Badge tone={person.status === "active" ? "success" : "danger"}>
                        {person.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="badge-stack">
                        {person.assigned_products.length === 0 ? (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        ) : (
                          person.assigned_products.map((ap) => (
                            <Badge key={ap.id} tone="success">
                              {ap.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="actions-cell">
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

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add person"
        description="Invite someone with email and organization, optionally assigning products now."
        wide
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-person" disabled={saving}>
              {saving ? "Saving…" : "Add person"}
            </Button>
          </div>
        }
      >
        <form id="add-person" onSubmit={onAddPerson}>
          <div className="form-field">
            <label htmlFor="person-name">Full name</label>
            <input
              id="person-name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="person-email">Email</label>
            <input
              id="person-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="person-org">Organization</label>
            <select
              id="person-org"
              value={form.organization_id}
              onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
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
            <label>Products (optional)</label>
            <div className="check-list">
              {products.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={form.product_ids.includes(p.id)}
                    onChange={() => toggleFormProduct(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
