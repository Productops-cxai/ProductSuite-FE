import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { deletePayflowClient, listPayflowClients } from "../../api/payflow";
import {
  Btn,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  PrimaryCell,
  SearchInput,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Pagination } from "../../components/ui/Pagination";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useOffsetPagination } from "../../hooks/useOffsetPagination";
import { incompleteSetupSections, isClientSettingUp } from "../../lib/client-setup";
import { invalidateCache } from "../../lib/dedupeAsync";
import { SHOW_PAYFLOW_DELETE } from "../../lib/payflow-features";
import type { PayflowClient } from "../../types";

const PAGE_SIZE = 10;

function clientStatusTone(status: string): Tone {
  const s = (status || "").toLowerCase();
  if (s === "active") return "success";
  if (s === "draft") return "neutral";
  return "warning";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function phase1StatusLabel(status?: string | null, statusLabel?: string | null): string {
  const raw = (statusLabel || status || "").toLowerCase();
  if (raw === "active") return "Active";
  return "Draft";
}

export function PayFlowClientsPage() {
  const { hasPermission } = usePayFlowAccess();
  const canCreate = hasPermission("create_client");
  const canEdit = hasPermission("edit_client");
  const canDelete = SHOW_PAYFLOW_DELETE && hasPermission("delete_client");
  const canImport = hasPermission("import_clients");
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => {
    const raw = searchParams.get("status");
    if (!raw) return "All Statuses";
    if (raw.toLowerCase() === "active") return "Active";
    if (raw.toLowerCase() === "draft") return "Draft";
    return "All Statuses";
  });
  const [addedThrough, setAddedThrough] = useState("All Sources");
  const [pendingDelete, setPendingDelete] = useState<PayflowClient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filterKey = `${search}|${status}|${addedThrough}`;
  const { offset, pageSize, goPrev, goNext } = useOffsetPagination(PAGE_SIZE, filterKey);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      invalidateCache("payflow:clients");
      const clientRes = await listPayflowClients({});
      setClients(clientRes.clients || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !`${c.name} ${c.code} ${c.client_type_label || ""} ${c.business_domain_label || ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (status !== "All Statuses") {
        if (phase1StatusLabel(c.status, c.status_label) !== status) return false;
      }
      if (addedThrough !== "All Sources") {
        const label = c.added_through_label || "Created";
        if (label !== addedThrough) return false;
      }
      return true;
    });
  }, [clients, search, status, addedThrough]);

  const rows = useMemo(
    () => filtered.slice(offset, offset + pageSize),
    [filtered, offset, pageSize],
  );

  async function onDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deletePayflowClient(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage organizations and their collection operations."
        actions={
          canCreate || canImport ? (
            <div className="flex flex-wrap gap-2">
              {canImport ? (
                <Link to="/payflow/imports?type=client">
                  <Btn variant="ghost">Import History</Btn>
                </Link>
              ) : null}
              {canImport ? (
                <Link to="/payflow/clients/import">
                  <Btn>Import from File</Btn>
                </Link>
              ) : null}
              {canCreate ? (
                <Link to="/payflow/clients/new">
                  <Btn variant="primary">+ Add Client</Btn>
                </Link>
              ) : null}
            </div>
          ) : undefined
        }
      />

      {error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients"
          className="w-full md:col-span-2 xl:w-56"
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", "Draft", "Active"]}
        />
        <FilterSelect
          label="Added through"
          value={addedThrough}
          onChange={setAddedThrough}
          options={["All Sources", "Add Client", "File Upload"]}
        />
      </FilterBar>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clients match these filters.</p>
      ) : isMobile ? (
        <MobileRecordCards>
          {rows.map((c) => {
            const statusLabel = phase1StatusLabel(c.status, c.status_label);
            const settingUp = isClientSettingUp(c.status_label || c.status);
            const remainingSteps = incompleteSetupSections(c.onboarding, c.setup_incomplete);
            // Prefer filtered FE labels; BE setup_steps_remaining excludes optional portfolios.
            const remaining =
              remainingSteps.length > 0
                ? remainingSteps.length
                : typeof c.setup_steps_remaining === "number"
                  ? c.setup_steps_remaining
                  : 0;
            const showSetupHint = settingUp || remaining > 0;
            return (
              <MobileRecordCard
                key={c.id}
                to={`/payflow/clients/${c.id}`}
                title={c.name}
                subtitle={c.code || c.industry || c.category || undefined}
                badges={
                  <StatusPill tone={clientStatusTone(statusLabel)}>{statusLabel}</StatusPill>
                }
                meta={
                  <div className="space-y-0.5">
                    <p>
                      {c.client_type_label || c.client_type || "—"} ·{" "}
                      {c.business_domain_label || c.business_domain || "Collections"}
                    </p>
                    {showSetupHint && remaining > 0 ? (
                      <p className="text-amber-700 dark:text-amber-400">
                        ⚠ {remaining} step{remaining > 1 ? "s" : ""} left
                      </p>
                    ) : null}
                  </div>
                }
                footer={
                  canDelete ? (
                    <button
                      type="button"
                      className="text-[12.5px] font-semibold text-destructive hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDelete(c);
                      }}
                    >
                      Delete
                    </button>
                  ) : canEdit && showSetupHint ? (
                    <span className="text-[12.5px] font-semibold text-primary">
                      Complete setup →
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </MobileRecordCards>
      ) : (
        <DataTable
          minWidth={1180}
          head={[
            "Client Name",
            "Client Code / Reference",
            "Client Type",
            "Business Use Case",
            "Status",
            "Created Date",
            "Last Updated Date",
            "Added through",
            "",
          ]}
        >
          {rows.map((c) => {
            const statusLabel = phase1StatusLabel(c.status, c.status_label);
            const settingUp = isClientSettingUp(c.status_label || c.status);
            const remainingSteps = incompleteSetupSections(c.onboarding, c.setup_incomplete);
            // Prefer filtered FE labels; BE setup_steps_remaining excludes optional portfolios.
            const remaining =
              remainingSteps.length > 0
                ? remainingSteps.length
                : typeof c.setup_steps_remaining === "number"
                  ? c.setup_steps_remaining
                  : 0;
            const showSetupHint = settingUp || remaining > 0;
            const addedLabel = c.added_through_label || "Created";

            return (
              <Tr key={c.id}>
                <Td>
                  <Link to={`/payflow/clients/${c.id}`} className="hover:underline">
                    <PrimaryCell title={c.name} subtitle={c.industry || c.category || undefined} />
                  </Link>
                  {showSetupHint ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      {remaining > 0 ? (
                        <StatusPill tone="warning">
                          ⚠ {remaining} step{remaining > 1 ? "s" : ""} left
                        </StatusPill>
                      ) : null}
                      {canEdit ? (
                        <Link
                          to={`/payflow/clients/${c.id}?tab=Configuration`}
                          className="text-[12.5px] font-semibold text-primary hover:underline"
                        >
                          {remaining > 0
                            ? "Complete setup →"
                            : settingUp
                              ? "Edit draft"
                              : "View setup →"}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </Td>
                <Td className="tabular text-muted-foreground">{c.code || "—"}</Td>
                <Td className="text-muted-foreground">
                  {c.client_type_label || c.client_type || "—"}
                </Td>
                <Td className="text-muted-foreground">
                  {c.business_domain_label || c.business_domain || "Collections"}
                </Td>
                <Td>
                  <StatusPill tone={clientStatusTone(statusLabel)}>{statusLabel}</StatusPill>
                </Td>
                <Td className="text-muted-foreground">{formatDate(c.created_at)}</Td>
                <Td className="text-muted-foreground">{formatDateTime(c.updated_at)}</Td>
                <Td>
                  <StatusPill
                    tone={
                      addedLabel === "Created from file upload" || addedLabel === "File Upload"
                        ? "info"
                        : "neutral"
                    }
                  >
                    {addedLabel}
                  </StatusPill>
                </Td>
                <Td>
                  <div className="flex flex-col items-end gap-1">
                    {canDelete ? (
                      <button
                        type="button"
                        className="text-[12.5px] font-semibold text-destructive hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingDelete(c);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </DataTable>
      )}

      {!loading && filtered.length > 0 ? (
        <Pagination
          total={filtered.length}
          offset={offset}
          pageSize={pageSize}
          rowCount={rows.length}
          onPrevious={goPrev}
          onNext={goNext}
        />
      ) : null}

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete client?"}
        description="This deletes the client and related portfolios, accounts, cases, rules, workflows, reviews, communications, and supervisor assignments. The full record is saved in Deletion Logs."
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}
