import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  acknowledgePayflowOperationalException,
  listPayflowOperationalExceptions,
  resolvePayflowOperationalException,
} from "../../api/payflow";
import {
  Btn,
  DataTable,
  EmptyState,
  FilterSelect,
  KpiCard,
  PageHeader,
  Panel,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { PayflowOperationalException } from "../../types";

function severityTone(severity: string): Tone {
  switch (severity) {
    case "Critical":
    case "High":
      return "danger";
    case "Medium":
      return "warning";
    default:
      return "neutral";
  }
}

function statusTone(status: string): Tone {
  switch (status) {
    case "Open":
      return "danger";
    case "Acknowledged":
      return "warning";
    case "Resolved":
      return "success";
    default:
      return "neutral";
  }
}

function typeLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStamp(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PayFlowExceptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = usePayFlowAccess();
  const canManage = hasPermission("manage_operational_exceptions");
  const [rows, setRows] = useState<PayflowOperationalException[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [ackCount, setAckCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [status, setStatus] = useState(searchParams.get("status") || "Open");
  const [exceptionType, setExceptionType] = useState(
    searchParams.get("type") || "All Types",
  );

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    if (nextStatus) setStatus(nextStatus);
    const nextType = searchParams.get("type");
    if (nextType) setExceptionType(nextType);
  }, [searchParams]);

  function reload() {
    setLoading(true);
    setError("");
    listPayflowOperationalExceptions({
      status: status !== "All Statuses" ? status : undefined,
      exception_type: exceptionType !== "All Types" ? exceptionType : undefined,
      limit: 100,
    })
      .then((res) => {
        setRows(res.exceptions || []);
        setOpenCount(res.open_count || 0);
        setAckCount(res.acknowledged_count || 0);
        setResolvedCount(res.resolved_count || 0);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.detail : "Failed to load exceptions");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, exceptionType]);

  async function onAcknowledge(id: number) {
    if (!canManage) return;
    setBusyId(id);
    try {
      await acknowledgePayflowOperationalException(id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Acknowledge failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onResolve(id: number) {
    if (!canManage) return;
    setBusyId(id);
    try {
      await resolvePayflowOperationalException(id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Resolve failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Operational Exceptions"
        description="Failed or blocked collection activities that need investigation. Separate from Human Review governance."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Open" value={String(openCount)} />
        <KpiCard label="Acknowledged" value={String(ackCount)} />
        <KpiCard label="Resolved" value={String(resolvedCount)} />
      </div>

      <Panel
        title="Exceptions"
        description="Communication, workflow, payment, and processing issues in your client scope."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              const next = new URLSearchParams(searchParams);
              if (v === "All Statuses") next.delete("status");
              else next.set("status", v);
              setSearchParams(next);
            }}
            options={["All Statuses", "Open", "Acknowledged", "Resolved"]}
          />
          <FilterSelect
            label="Type"
            value={exceptionType}
            onChange={setExceptionType}
            options={[
              "All Types",
              "communication_failure",
              "workflow_execution_failure",
              "payment_processing_issue",
              "processing_discrepancy",
            ]}
          />
        </div>

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading exceptions…</p> : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            title="No exceptions match these filters"
            description="Operational failures will appear here when workflows, communications, or payments fail."
          />
        ) : null}

        {!loading && rows.length > 0 ? (
          <DataTable
            minWidth={980}
            head={[
              "When",
              "Type",
              "Severity",
              "Client",
              "Case",
              "Reason",
              "Status",
              "",
            ]}
          >
            {rows.map((ex) => (
              <Tr key={ex.id}>
                <Td className="tabular text-muted-foreground">{formatStamp(ex.created_at)}</Td>
                <Td>{typeLabel(ex.exception_type)}</Td>
                <Td>
                  <StatusPill tone={severityTone(ex.severity)}>{ex.severity}</StatusPill>
                </Td>
                <Td>{ex.client_name || "—"}</Td>
                <Td>
                  {ex.account_id ? (
                    <Link
                      to={ex.link || `/payflow/cases/${ex.account_id}`}
                      className="text-primary hover:underline"
                    >
                      {ex.account_reference || ex.case_reference || `#${ex.account_id}`}
                    </Link>
                  ) : ex.link ? (
                    <Link to={ex.link} className="text-primary hover:underline">
                      Open record
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="max-w-[280px] truncate" title={ex.reason}>
                  {ex.reason}
                </Td>
                <Td>
                  <StatusPill tone={statusTone(ex.status)}>{ex.status}</StatusPill>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {canManage && ex.status === "Open" ? (
                      <Btn
                        variant="secondary"
                        disabled={busyId === ex.id}
                        onClick={() => void onAcknowledge(ex.id)}
                      >
                        Ack
                      </Btn>
                    ) : null}
                    {canManage && ex.status !== "Resolved" ? (
                      <Btn
                        variant="secondary"
                        disabled={busyId === ex.id}
                        onClick={() => void onResolve(ex.id)}
                      >
                        Resolve
                      </Btn>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        ) : null}
      </Panel>
    </>
  );
}
