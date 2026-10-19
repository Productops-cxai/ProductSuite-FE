import { FormEvent, Fragment, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { listDeletionLogs } from "../../api/platform";
import { listPayflowDeletionLogs } from "../../api/payflow";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useOptionalPayFlowAccess } from "../../context/PayFlowAccessContext";
import { ui } from "../../lib/ui";
import type { DeletionLog } from "../../types";

type Props = {
  workspace: "platform" | "payflow";
};

type RelatedItem = { entity_type?: string; id?: string; label?: string };

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  code: "Code",
  name: "Name",
  title: "Title",
  status: "Status",
  category: "Category",
  client_type: "Client type",
  business_domain: "Business domain",
  ai_mode: "AI mode",
  data_source_type: "Data source",
  connection_status: "Connection",
  crm_system_name: "CRM system",
  integration_ref: "Integration ref",
  crm_client_number: "CRM client #",
  contact_name: "Contact name",
  contact_title: "Contact title",
  contact_email: "Contact email",
  contact_phone: "Contact phone",
  address_line1: "Address",
  address_line2: "Address line 2",
  city: "City",
  province_state: "Province / state",
  country: "Country",
  postal_code: "Postal code",
  correspondence_language: "Language",
  currency_code: "Currency",
  brand_name: "Brand",
  logo_url: "Logo",
  sender_name: "Sender name",
  email_from: "Email from",
  sms_sender_id: "SMS sender",
  channel_email: "Email channel",
  channel_sms: "SMS channel",
  environment: "Environment",
  sync_frequency: "Sync frequency",
  crm_status: "CRM status",
  customer_name: "Customer",
  account_reference: "Account #",
  case_reference: "Case #",
  original_balance: "Original balance",
  outstanding_balance: "Outstanding",
  recovered_balance: "Recovered",
  collection_status: "Collection status",
  email: "Email",
  full_name: "Full name",
  role_code: "Role",
  phone_mobile: "Mobile",
  phone_work: "Work phone",
  portfolio_id: "Portfolio ID",
  client_id: "Client ID",
  created_at: "Created",
  updated_at: "Updated",
};

const ENTITY_LABELS: Record<string, string> = {
  client: "Client",
  portfolio: "Portfolio",
  account: "Account",
  case: "Case",
  workflow: "Workflow",
  strategy: "Workflow",
  rule: "Rule",
  review: "Human review",
  review_unlink: "Review unlink",
  communication: "Communication",
  notification: "Notification",
  user: "User",
  person: "Person",
  product: "Product",
  role: "Role",
  role_permission: "Role permission",
  client_assignment: "Client assignment",
  payflow_membership: "PayFlow membership",
  product_assignment: "Product assignment",
  auth_token: "Auth token",
  refresh_token: "Refresh token",
  user_session: "Session",
};

function humanLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function entityLabel(type: string | undefined): string {
  if (!type) return "Related item";
  if (ENTITY_LABELS[type]) return ENTITY_LABELS[type];
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    }
    return trimmed.replace(/_/g, " ");
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((v) => v == null || ["string", "number", "boolean"].includes(typeof v))) {
      return value.map((v) => formatValue(v)).join(", ");
    }
    return `${value.length} items`;
  }
  if (typeof value === "object") return "Details on file";
  return String(value);
}

function isEmptyValue(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return true;
  }
  return false;
}

function snapshotEntries(snapshot: DeletionLog["record_snapshot"]): Array<[string, unknown]> {
  if (!snapshot) return [];
  if (Array.isArray(snapshot)) {
    return snapshot.map((item, i) => [`Item ${i + 1}`, item]);
  }
  return Object.entries(snapshot);
}

function groupRelated(items: RelatedItem[]): Array<{ type: string; items: RelatedItem[] }> {
  const map = new Map<string, RelatedItem[]>();
  for (const item of items) {
    const key = item.entity_type || "other";
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([type, grouped]) => ({ type, items: grouped }));
}

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  const map: Record<string, string> = {
    "/payflow/clients": "PayFlow · Clients",
    "/payflow/users": "PayFlow · Users",
    "/payflow/workflows": "PayFlow · Workflows",
    "/payflow/rules": "PayFlow · Rules",
    "/platform/people": "Platform · People",
    "/platform/products": "Platform · Products",
  };
  if (map[source]) return map[source];
  return source
    .replace(/^\//, "")
    .split("/")
    .map((p) => p.replace(/-/g, " "))
    .map((p) => p.replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" · ");
}

function DeletionDetail({ row }: { row: DeletionLog }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const related = row.related_deleted || [];
  const relatedGroups = groupRelated(related);
  const allEntries = snapshotEntries(row.record_snapshot);
  const entries = showEmpty ? allEntries : allEntries.filter(([, v]) => !isEmptyValue(v));
  const emptyCount = allEntries.filter(([, v]) => isEmptyValue(v)).length;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
            Deleted {entityLabel(row.entity_type).toLowerCase()} details
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
            Snapshot of what was on the record when it was removed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {emptyCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setShowEmpty((v) => !v)}>
              {showEmpty ? "Hide empty fields" : `Show ${emptyCount} empty`}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? "Readable view" : "Raw data"}
          </Button>
        </div>
      </div>

      {showRaw ? (
        <pre className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-white p-3 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {JSON.stringify(
            { record: row.record_snapshot, related_deleted: row.related_deleted },
            null,
            2,
          )}
        </pre>
      ) : (
        <>
          {entries.length === 0 ? (
            <p className="text-[13px] text-slate-500">No field values were stored for this delete.</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-md border border-slate-200/70 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {humanLabel(key)}
                  </dt>
                  <dd className="mt-0.5 break-words text-[13px] font-medium text-slate-900 dark:text-slate-100">
                    {formatValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="mb-2 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
              Also removed
              <span className="ml-2 text-[12px] font-normal text-slate-500">
                {related.length === 0
                  ? "— nothing else cascaded"
                  : `${related.length} related record${related.length === 1 ? "" : "s"}`}
              </span>
            </div>
            {related.length === 0 ? null : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {relatedGroups.map((group) => (
                  <div
                    key={group.type}
                    className="rounded-md border border-slate-200/70 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="mb-1.5 text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                      {entityLabel(group.type)}
                      <span className="ml-1.5 font-normal text-slate-500">({group.items.length})</span>
                    </div>
                    <ul className="max-h-36 space-y-1 overflow-auto text-[12px] text-slate-600 dark:text-slate-300">
                      {group.items.slice(0, 12).map((item, idx) => (
                        <li key={`${item.id || idx}-${idx}`} className="flex gap-2">
                          <span className="min-w-0 flex-1 truncate">
                            {item.label || item.id || "Untitled"}
                          </span>
                          {item.id && item.label ? (
                            <span className="shrink-0 font-mono text-[10.5px] text-slate-400">
                              #{item.id}
                            </span>
                          ) : null}
                        </li>
                      ))}
                      {group.items.length > 12 ? (
                        <li className="text-slate-500">+{group.items.length - 12} more</li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function DeletionLogsPage({ workspace }: Props) {
  const payflow = useOptionalPayFlowAccess();
  const [rows, setRows] = useState<DeletionLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {
        search: search.trim() || undefined,
        entity_type: typeFilter || undefined,
        limit: 200,
      };
      setRows(
        workspace === "payflow"
          ? await listPayflowDeletionLogs(params)
          : await listDeletionLogs(params),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load deletion logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, workspace]);

  if (workspace === "payflow" && payflow && !payflow.loading && !payflow.isOperationsAdmin) {
    return (
      <p className="text-sm text-slate-500">
        Only an Operations Admin can view deletion logs.
      </p>
    );
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  const types = Array.from(new Set(rows.map((r) => r.entity_type))).sort();

  return (
    <div className={workspace === "platform" ? ui.page : undefined}>
      <PageHeader
        title="Deletion Logs"
        description="Every admin delete is recorded here: who did it, from which page, what the record contained, and which related rows were removed."
        breadcrumb={
          workspace === "platform"
            ? [{ label: "Logs" }, { label: "Deletion Logs" }]
            : [{ label: "Administration" }, { label: "Deletion Logs" }]
        }
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}

      <form className="mb-3.5 flex flex-wrap gap-3" onSubmit={(e) => void onSearch(e)}>
        <div className={ui.search}>
          <span className={ui.searchIcon}>
            <Icon name="search" />
          </span>
          <input
            className={ui.searchInput}
            placeholder="Search record, actor, or page"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={ui.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {entityLabel(t)}
            </option>
          ))}
        </select>
      </form>

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading deletion logs…</div>
        ) : rows.length === 0 ? (
          <div className={ui.empty}>No deletions recorded yet.</div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>WHEN</th>
                <th className={ui.th}>ACTIVITY</th>
                <th className={ui.th}>RECORD</th>
                <th className={ui.th}>WHO</th>
                <th className={ui.th}>FROM</th>
                <th className={ui.th}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = openId === row.id;
                const relatedCount = row.related_deleted?.length || 0;
                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                      <td className={ui.td}>
                        <strong className="capitalize">{row.activity}</strong>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {entityLabel(row.entity_type)}
                        </span>
                      </td>
                      <td className={ui.td}>
                        <strong>{row.entity_label}</strong>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          ID {row.entity_id}
                        </span>
                      </td>
                      <td className={ui.td}>
                        <span className={ui.person}>{row.actor_name}</span>
                        <span className={ui.personSub}>
                          {row.actor_email}
                          {row.actor_role ? ` · ${row.actor_role.replace(/_/g, " ")}` : ""}
                        </span>
                      </td>
                      <td className={ui.td}>
                        <span className="text-[13px]">{sourceLabel(row.source)}</span>
                        {row.source ? (
                          <span className="mt-0.5 block font-mono text-[10.5px] text-slate-400">
                            {row.source}
                          </span>
                        ) : null}
                      </td>
                      <td className={ui.td}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setOpenId(open ? null : row.id)}
                        >
                          {open
                            ? "Hide"
                            : relatedCount > 0
                              ? `View · ${relatedCount} related`
                              : "View details"}
                        </Button>
                      </td>
                    </tr>
                    {open ? (
                      <tr>
                        <td className={ui.td} colSpan={6}>
                          <DeletionDetail row={row} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
