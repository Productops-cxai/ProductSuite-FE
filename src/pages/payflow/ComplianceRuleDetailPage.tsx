import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activateComplianceRule,
  approveComplianceRule,
  deactivateComplianceRule,
  duplicateComplianceRule,
  getComplianceAudit,
  getComplianceRule,
  rejectComplianceRule,
  scheduleComplianceRule,
  submitComplianceRule,
} from "../../api/compliance";
import { complianceStatusTone } from "../../components/payflow/ComplianceRuleForm";
import {
  Btn,
  DataTable,
  PageHeader,
  Panel,
  StatusPill,
  TabBar,
  Td,
  Tr,
} from "../../components/payflow/lovable/payflow-ui";
import { Modal } from "../../components/ui/Modal";
import type { ComplianceAuditEntry, ComplianceRule } from "../../types";

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function valueText(value: unknown) {
  if (value == null) return "—";
  return JSON.stringify(value, null, 2);
}

export function PayFlowComplianceRuleDetailPage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedStatus = (location.state as { savedStatus?: string } | null)?.savedStatus;
  const [rule, setRule] = useState<ComplianceRule | null>(null);
  const [audit, setAudit] = useState<ComplianceAuditEntry[]>([]);
  const [tab, setTab] = useState<"Details" | "Audit History">(() =>
    new URLSearchParams(window.location.search).get("tab") === "audit" ? "Audit History" : "Details",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(savedStatus ? `Saved. Status is now ${savedStatus}.` : "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"" | "activate" | "deactivate" | "approve" | "submit">("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [activateOn, setActivateOn] = useState("");

  const id = Number(ruleId);
  const auditRequested = searchParams.get("tab") === "audit";

  useEffect(() => {
    setTab(auditRequested ? "Audit History" : "Details");
  }, [id, auditRequested]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([getComplianceRule(id), getComplianceAudit(id)])
      .then(([next, history]) => {
        if (cancelled) return;
        setRule(next);
        setAudit(history.entries || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRule(null);
          setError(err instanceof ApiError ? err.detail : "Failed to load the compliance rule.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function refreshAudit() {
    const history = await getComplianceAudit(id);
    setAudit(history.entries || []);
  }

  async function run(action: () => Promise<ComplianceRule>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await action();
      setRule(next);
      setNotice(success.replace("{status}", next.status));
      await refreshAudit();
      setConfirm("");
      setRejectOpen(false);
      setScheduleOpen(false);
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "The request was not completed.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    if (!rule) return;
    setBusy(true);
    setError("");
    try {
      const copy = await duplicateComplianceRule(rule.id);
      navigate(`/payflow/compliance-rules/${copy.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "The rule could not be duplicated.");
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading compliance rule…</p>;
  if (!rule) return <p className="text-sm text-destructive">{error || "Compliance rule not found."}</p>;

  const configEntries = Object.entries(rule.configuration || {});

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Compliance Rules", to: "/payflow/compliance-rules" },
          { label: rule.code },
        ]}
        title={rule.name}
        description={`${rule.code} · Version ${rule.version} · ${rule.scope_level}`}
        actions={
          <>
            <StatusPill tone={complianceStatusTone(rule.status)}>{rule.status}</StatusPill>
            <StatusPill tone={rule.classification === "Mandatory" ? "info" : "neutral"}>
              {rule.classification}
            </StatusPill>
            {rule.can_edit && rule.status !== "Expired" ? (
              <Link to={`/payflow/compliance-rules/${rule.id}/edit`}>
                <Btn>Edit</Btn>
              </Link>
            ) : null}
            {rule.can_edit ? (
              <Btn disabled={busy} onClick={() => void duplicate()}>
                Duplicate
              </Btn>
            ) : null}
          </>
        }
      />
      {rule.status === "Active" ? (
        <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-[13px]">
          This rule is active. Changes can affect associated clients and future collection activity.
        </p>
      ) : null}
      {notice ? <p className="mb-3 text-sm text-success">{notice}</p> : null}
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <TabBar
        tabs={["Details", "Audit History"] as const}
        active={tab}
        onChange={(next) => {
          setTab(next);
          const nextParams = new URLSearchParams(searchParams);
          if (next === "Audit History") nextParams.set("tab", "audit");
          else nextParams.delete("tab");
          setSearchParams(nextParams, { replace: true });
        }}
        className="mb-4"
      />

      {tab === "Details" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {rule.can_edit && (rule.status === "Draft" || rule.status === "Inactive") ? (
              <Btn disabled={busy} onClick={() => setConfirm("submit")}>
                Submit for Review
              </Btn>
            ) : null}
            {rule.can_manage_status && rule.status === "Pending Review" ? (
              <>
                <Btn variant="primary" disabled={busy} onClick={() => setConfirm("approve")}>
                  Approve
                </Btn>
                <Btn disabled={busy} onClick={() => setRejectOpen(true)}>
                  Reject
                </Btn>
              </>
            ) : null}
            {rule.can_manage_status &&
            (rule.status === "Inactive" || rule.status === "Scheduled" || rule.status === "Pending Review") ? (
              <Btn disabled={busy} onClick={() => setConfirm("activate")}>
                Activate
              </Btn>
            ) : null}
            {rule.can_manage_status && (rule.status === "Active" || rule.status === "Scheduled") ? (
              <Btn variant="danger" disabled={busy} onClick={() => setConfirm("deactivate")}>
                Deactivate
              </Btn>
            ) : null}
            {rule.can_manage_status &&
            (rule.status === "Draft" || rule.status === "Inactive" || rule.status === "Pending Review") ? (
              <Btn disabled={busy} onClick={() => setScheduleOpen(true)}>
                Schedule Activation
              </Btn>
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Rule information">
              <dl className="space-y-2 text-[13px]">
                <Info label="Category" value={rule.category} />
                <Info label="Description" value={rule.description || "—"} />
                <Info label="Regulatory authority" value={rule.regulatory_authority || "—"} />
                <Info label="Legal reference" value={rule.legal_reference || "—"} />
                <Info label="Effective" value={rule.effective_date || "—"} />
                <Info label="Expiry" value={rule.expiry_date || "—"} />
                {rule.scheduled_for ? <Info label="Scheduled for" value={rule.scheduled_for} /> : null}
              </dl>
            </Panel>
            <Panel title="Jurisdiction">
              <p className="text-[13px] text-foreground">{rule.jurisdiction_label}</p>
              <p className="mt-2 text-[12px] text-muted-foreground">{rule.scope_level}</p>
            </Panel>
            <Panel title="Applicability">
              <dl className="space-y-2 text-[13px]">
                <Info label="Collector type" value={rule.collector_types.join(", ") || "Any"} />
                <Info label="Debt type" value={rule.debt_types.join(", ") || "Any"} />
                <Info label="Channel" value={rule.channel_label} />
                <Info label="Conditions" value={rule.applicability_conditions || "—"} />
              </dl>
            </Panel>
            <Panel title="Enforcement">
              <dl className="space-y-2 text-[13px]">
                <Info label="Action" value={rule.action} />
                <Info label="Override allowed" value={rule.override_allowed ? "Yes" : "No"} />
                <Info label="Authorization level" value={rule.override_authorization_level || "—"} />
                <Info label="Reason required" value={rule.override_reason_required ? "Yes" : "No"} />
              </dl>
            </Panel>
          </div>
          <Panel title="Configured restrictions">
            {configEntries.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No category fields are stored yet.</p>
            ) : (
              <dl className="space-y-2 text-[13px]">
                {configEntries.map(([key, value]) => (
                  <Info
                    key={key}
                    label={key.replace(/_/g, " ")}
                    value={
                      Array.isArray(value)
                        ? value.join(", ") || "—"
                        : value == null || value === ""
                          ? "—"
                          : String(value)
                    }
                  />
                ))}
              </dl>
            )}
          </Panel>
          <Panel
            title="Associated clients"
            description="Clients whose address matches this rule while it is active or scheduled."
          >
            {(rule.associated_clients || []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No visible clients currently match this rule.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {(rule.associated_clients || []).map((client) => (
                  <li key={client.id}>
                    <Link
                      to={`/payflow/clients/${client.id}?tab=Rules`}
                      className="font-medium text-primary hover:underline"
                    >
                      {client.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {client.code} · {client.selected ? "Selected" : "Not selected"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Last updated">
            <p className="text-[13px] text-foreground">
              {rule.updated_by || rule.created_by || "—"} · {formatWhen(rule.updated_at || rule.created_at)}
            </p>
          </Panel>
        </div>
      ) : (
        <Panel title="Audit history" description="Read-only record of changes to this rule.">
          {audit.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No audit history is available yet.</p>
          ) : (
            <DataTable
              minWidth={980}
              head={["Action", "Modified by", "Date / time", "Version", "Previous value", "Updated value"]}
            >
              {audit.map((entry) => (
                <Tr key={entry.id}>
                  <Td className="whitespace-normal">{entry.action}</Td>
                  <Td>{entry.modified_by}</Td>
                  <Td>{formatWhen(entry.modified_at)}</Td>
                  <Td>{entry.version}</Td>
                  <Td className="max-w-[280px] whitespace-normal">
                    <pre className="max-h-40 overflow-auto text-[11px]">{valueText(entry.previous_value)}</pre>
                  </Td>
                  <Td className="max-w-[280px] whitespace-normal">
                    <pre className="max-h-40 overflow-auto text-[11px]">{valueText(entry.updated_value)}</pre>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </Panel>
      )}

      <Modal
        title="Confirm status change"
        open={confirm !== ""}
        onClose={() => setConfirm("")}
        footer={
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setConfirm("")}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={busy}
              onClick={() => {
                if (confirm === "submit") {
                  void run(() => submitComplianceRule(rule.id), "Submitted. Status is now {status}.");
                }
                if (confirm === "approve") {
                  void run(() => approveComplianceRule(rule.id), "Approved. Status is now {status}.");
                }
                if (confirm === "activate") {
                  void run(() => activateComplianceRule(rule.id), "Activated. Status is now {status}.");
                }
                if (confirm === "deactivate") {
                  void run(() => deactivateComplianceRule(rule.id), "Deactivated. Status is now {status}.");
                }
              }}
            >
              Confirm
            </Btn>
          </div>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          {confirm === "deactivate"
            ? "Deactivating stops this rule from applying to future collection activity."
            : "The rule status updates after the server confirms the change."}
        </p>
      </Modal>
      <Modal
        title="Reject rule"
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setRejectOpen(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={busy || !reason.trim()}
              onClick={() =>
                void run(
                  () => rejectComplianceRule(rule.id, reason.trim()),
                  "Rejected. Status is now {status}.",
                )
              }
            >
              Reject
            </Btn>
          </div>
        }
      >
        <label className="block text-[13px]">
          Reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border px-3 py-2"
          />
        </label>
      </Modal>
      <Modal
        title="Schedule activation"
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setScheduleOpen(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={busy || !activateOn}
              onClick={() =>
                void run(
                  () => scheduleComplianceRule(rule.id, activateOn),
                  "Scheduled. Status is now {status}.",
                )
              }
            >
              Schedule
            </Btn>
          </div>
        }
      >
        <label className="block text-[13px]">
          Activation date
          <input
            type="date"
            value={activateOn}
            onChange={(event) => setActivateOn(event.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-border px-3"
          />
        </label>
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
