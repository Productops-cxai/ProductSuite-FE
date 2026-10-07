import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  deletePayflowClient,
  listPayflowClients,
  listPayflowUsers,
} from "../../api/payflow";
import {
  Btn,
  DataTable,
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
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { PayflowClient, PayflowUser } from "../../types";

function clientStatusTone(status: string): Tone {
  const s = (status || "").toLowerCase();
  if (s === "active") return "success";
  if (s === "draft") return "neutral";
  if (s === "onboarding") return "info";
  return "warning";
}

function formatUpdatedAt(value?: string | null): string {
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

export function PayFlowClientsPage() {
  const { isOperationsAdmin, hasPermission } = usePayFlowAccess();
  const canCreate = hasPermission("create_client");
  const canEdit = hasPermission("edit_client");
  const canDelete = hasPermission("delete_client");
  const canImport = hasPermission("import_clients");
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [supervisors, setSupervisors] = useState<PayflowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => {
    const raw = searchParams.get("status");
    if (!raw) return "All Statuses";
    if (raw.toLowerCase() === "active") return "Active";
    if (raw.toLowerCase() === "draft") return "Draft";
    return raw;
  });
  const [aiMode, setAiMode] = useState("All AI Modes");
  const [supervisor, setSupervisor] = useState("All Supervisors");
  const [pendingDelete, setPendingDelete] = useState<PayflowClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const clientRes = await listPayflowClients({});
      setClients(clientRes.clients || []);
      if (isOperationsAdmin) {
        try {
          const userRes = await listPayflowUsers({ role_code: "supervisor" });
          setSupervisors(userRes.users || []);
        } catch {
          setSupervisors([]);
        }
      } else {
        // Supervisor filter options from assigned client supervisor names.
        const names = new Set<string>();
        for (const c of clientRes.clients || []) {
          for (const s of c.supervisors || []) {
            if (s.full_name) names.add(s.full_name);
          }
        }
        setSupervisors(
          [...names].map((full_name) => ({
            id: full_name,
            full_name,
            email: "",
            role_code: "supervisor",
            role_name: "Supervisor",
            role_scope: "client_scoped",
            status: "active",
            status_label: "Active",
            assigned_clients: [],
            permission_profile: "",
          })),
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOperationsAdmin]);

  const supervisorOptions = useMemo(
    () => ["All Supervisors", ...supervisors.map((s) => s.full_name)],
    [supervisors],
  );

  const rows = useMemo(() => {
    return clients.filter((c) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !`${c.name} ${c.code} ${c.industry || c.category || ""}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (status !== "All Statuses") {
        const label = c.status_label || c.status;
        if (label.toLowerCase() !== status.toLowerCase()) return false;
      }
      if (aiMode !== "All AI Modes") {
        const label = c.ai_mode_label || c.ai_mode || "";
        if (label !== aiMode) return false;
      }
      if (supervisor !== "All Supervisors") {
        const names = (c.supervisors || []).map((s) => s.full_name || s.short_name || "");
        if (!names.includes(supervisor)) return false;
      }
      return true;
    });
  }, [clients, search, status, aiMode, supervisor]);

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients"
          className="w-56"
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", "Draft", "Active"]}
        />
        <FilterSelect
          label="AI Mode"
          value={aiMode}
          onChange={setAiMode}
          options={["All AI Modes", "Autopilot", "Supervised AI"]}
        />
        <FilterSelect
          label="Supervisor"
          value={supervisor}
          onChange={setSupervisor}
          options={supervisorOptions}
        />
      </div>

      <DataTable
        minWidth={1180}
        head={[
          "Client",
          "Last File Received",
          "File Assigned",
          "Accounts In File",
          "Active Cases",
          "Outstanding",
          "Recovered",
          "AI Mode",
          "Supervisor",
          "Status",
          "",
        ]}
      >
        {loading ? (
          <tr>
            <Td className="text-muted-foreground">Loading clients…</Td>
          </tr>
        ) : (
          rows.map((c) => {
            const statusLabel = c.status_label || c.status;
            const aiLabel = c.ai_mode_label || "—";
            const supervisorNames =
              (c.supervisors || [])
                .map((s) => s.short_name || s.full_name.split(" ")[0] || s.full_name)
                .filter(Boolean)
                .join(", ") || "—";
            return (
              <Tr key={c.id}>
                <Td>
                  <Link to={`/payflow/clients/${c.id}`} className="hover:underline">
                    <PrimaryCell
                      title={c.name}
                      subtitle={`${c.industry || c.category || c.business_domain_label || "Collections"} · ${c.code}`}
                    />
                  </Link>
                </Td>
                <Td className="text-muted-foreground">
                  <PrimaryCell title={formatUpdatedAt(c.updated_at)} subtitle="Last updated" />
                </Td>
                <Td className="text-muted-foreground">—</Td>
                <Td className="tabular">
                  <PrimaryCell title="—" subtitle="—" />
                </Td>
                <Td className="tabular">0</Td>
                <Td className="tabular font-medium">—</Td>
                <Td className="tabular font-medium text-success">—</Td>
                <Td>
                  <StatusPill tone={aiLabel === "Autopilot" ? "ai" : "neutral"}>
                    {aiLabel}
                  </StatusPill>
                </Td>
                <Td className="text-muted-foreground">{supervisorNames}</Td>
                <Td>
                  <StatusPill tone={clientStatusTone(statusLabel)}>{statusLabel}</StatusPill>
                </Td>
                <Td>
                  <div className="flex flex-col items-end gap-1">
                    {canEdit && statusLabel.toLowerCase() === "draft" ? (
                      <Link
                        to={`/payflow/clients/${c.id}?tab=Configuration`}
                        className="text-[12.5px] font-semibold text-primary hover:underline"
                      >
                        Edit draft
                      </Link>
                    ) : null}
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
          })
        )}
        {!loading && rows.length === 0 && (
          <tr>
            <Td className="text-muted-foreground">No clients match these filters.</Td>
          </tr>
        )}
      </DataTable>

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
