import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  archiveComplianceRule,
  activateComplianceRule,
  approveComplianceRule,
  deactivateComplianceRule,
  duplicateComplianceRule,
  getComplianceRule,
  getComplianceRuleHistory,
  rejectComplianceRule,
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
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { ComplianceApiRule, ComplianceRuleHistory } from "../../types";

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

function historyRows(history: ComplianceRuleHistory) {
  if (history.audit?.length) {
    return history.audit.map((entry) => ({
      id: entry.id,
      action: entry.event,
      by: entry.by || "—",
      at: entry.at,
      version: "—",
      before: entry.before,
      after: entry.after,
    }));
  }
  const versions = [...(history.versions || [])].sort((a, b) => b.version - a.version);
  return versions.map((entry, index) => ({
    id: entry.id,
    action: entry.event,
    by: entry.changed_by || "—",
    at: entry.created_at,
    version: String(entry.version),
    before: versions[index + 1]?.snapshot ?? null,
    after: entry.snapshot,
  }));
}

export function PayFlowComplianceRuleDetailPage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, isOperationsAdmin } = usePayFlowAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedStatus = (location.state as { savedStatus?: string } | null)?.savedStatus;
  const [rule, setRule] = useState<ComplianceApiRule | null>(null);
  const [audit, setAudit] = useState<ReturnType<typeof historyRows>>([]);
  const [tab, setTab] = useState<"Details" | "Audit History">(() =>
    new URLSearchParams(window.location.search).get("tab") === "audit" ? "Audit History" : "Details",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(savedStatus ? `Saved. Status is now ${savedStatus}.` : "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    "" | "activate" | "deactivate" | "approve" | "approve-hold" | "submit" | "archive"
  >("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

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
    Promise.all([getComplianceRule(id), getComplianceRuleHistory(id).catch(() => null)])
      .then(([next, history]) => {
        if (cancelled) return;
        setRule(next);
        setAudit(history ? historyRows(history) : []);
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
    const history = await getComplianceRuleHistory(id);
    setAudit(historyRows(history));
  }

  async function run(action: () => Promise<ComplianceApiRule>, success: string) {
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

  const canEdit =
    hasPermission("modify_governance") &&
    rule.status !== "Archived" &&
    (rule.status !== "Active" || isOperationsAdmin);
  const canSubmit = canEdit && (rule.status === "Draft" || rule.status === "Inactive");
  const canReview = isOperationsAdmin && rule.status === "Pending Approval";
  const canActivate = isOperationsAdmin && rule.status === "Inactive" && Boolean(rule.approved_at);
  const canDeactivate = isOperationsAdmin && rule.status === "Active";
  const canArchive = isOperationsAdmin && rule.status !== "Active" && rule.status !== "Archived";
  const place = [rule.country, rule.state, rule.region, rule.city, rule.postal].filter(Boolean).join(" · ");
  const conditionText = (rule.conditions || [])
    .map((item) => {
      const field = String(item.field || "");
      const operator = String(item.operator || "Equals");
      const value = item.value == null ? "" : String(item.value);
      return field ? `${field} ${operator} ${value}` : "";
    })
    .filter(Boolean)
    .join(` ${rule.logic || "AND"} `);
  const configEntries = Object.entries(rule.settings || {});

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Compliance Rules", to: "/payflow/compliance-rules" },
          { label: rule.code },
        ]}
        title={rule.name}
        description={`${rule.code} · Version ${rule.version} · ${rule.jurisdiction_type || "Jurisdiction"}`}
        actions={
          <>
            <StatusPill tone={complianceStatusTone(rule.status)}>{rule.status}</StatusPill>
            <StatusPill tone={rule.enforcement === "Mandatory" ? "info" : "neutral"}>
              {rule.enforcement}
            </StatusPill>
            {canEdit ? (
              <Link to={`/payflow/compliance-rules/${rule.id}/edit`}>
                <Btn>Edit</Btn>
              </Link>
            ) : null}
            {hasPermission("modify_governance") ? (
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
      {rule.activation_problems?.length ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {rule.activation_problems.join(" ")}
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
            {canSubmit ? (
              <Btn disabled={busy} onClick={() => setConfirm("submit")}>
                Submit for Review
              </Btn>
            ) : null}
            {canReview ? (
              <>
                <Btn variant="primary" disabled={busy} onClick={() => setConfirm("approve")}>
                  Approve
                </Btn>
                <Btn disabled={busy} onClick={() => setConfirm("approve-hold")}>
                  Approve without activating
                </Btn>
                <Btn disabled={busy} onClick={() => setRejectOpen(true)}>
                  Reject
                </Btn>
              </>
            ) : null}
            {canActivate ? (
              <Btn disabled={busy} onClick={() => setConfirm("activate")}>
                Activate
              </Btn>
            ) : null}
            {canDeactivate ? (
              <Btn variant="danger" disabled={busy} onClick={() => setConfirm("deactivate")}>
                Deactivate
              </Btn>
            ) : null}
            {canArchive ? (
              <Btn disabled={busy} onClick={() => setConfirm("archive")}>
                Archive
              </Btn>
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Rule information">
              <dl className="space-y-2 text-[13px]">
                <Info label="Rule type" value={rule.rule_type_name ? `${rule.rule_type} · ${rule.rule_type_name}` : rule.rule_type || "—"} />
                <Info label="Category" value={rule.category || "—"} />
                <Info label="Description" value={rule.description || "—"} />
                <Info label="Regulatory authority" value={rule.regulatory_authority || "—"} />
                <Info label="Legal reference" value={rule.legal_reference || "—"} />
                <Info label="Effective" value={rule.effective_from || "—"} />
                <Info label="Expiry" value={rule.effective_until || "—"} />
              </dl>
            </Panel>
            <Panel title="Jurisdiction">
              <p className="text-[13px] text-foreground">{place || "—"}</p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {rule.jurisdiction_type || "Federal"}
                {rule.timezone ? ` · ${rule.timezone}` : ""}
              </p>
            </Panel>
            <Panel title="Applicability">
              <dl className="space-y-2 text-[13px]">
                <Info label="Collector type" value={rule.collector_type || "Any"} />
                <Info label="Debt type" value={rule.debt_type || "Any"} />
                <Info label="Channel" value={rule.channel || "—"} />
                <Info label="Conditions" value={conditionText || "—"} />
              </dl>
            </Panel>
            <Panel title="Enforcement">
              <dl className="space-y-2 text-[13px]">
                <Info label="Action" value={rule.action || "—"} />
                <Info label="Enforcement" value={rule.enforcement || "—"} />
                <Info label="Override policy" value={rule.override_policy || "Not Permitted"} />
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
            description="Client selections are managed on each client."
          >
            <p className="text-[13px] text-muted-foreground">
              {rule.client_id
                ? `This rule belongs to client ${rule.client_id}.`
                : "This rule applies by jurisdiction. Open a client to review which rules are on for that client."}
            </p>
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
                  <Td>{entry.by}</Td>
                  <Td>{formatWhen(entry.at)}</Td>
                  <Td>{entry.version}</Td>
                  <Td className="max-w-[280px] whitespace-normal">
                    <pre className="max-h-40 overflow-auto text-[11px]">{valueText(entry.before)}</pre>
                  </Td>
                  <Td className="max-w-[280px] whitespace-normal">
                    <pre className="max-h-40 overflow-auto text-[11px]">{valueText(entry.after)}</pre>
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
              disabled={busy || (confirm === "deactivate" && !reason.trim())}
              onClick={() => {
                if (confirm === "submit") {
                  void run(() => submitComplianceRule(rule.id, reason.trim() || undefined), "Submitted. Status is now {status}.");
                }
                if (confirm === "approve") {
                  void run(() => approveComplianceRule(rule.id, reason.trim() || undefined), "Approved. Status is now {status}.");
                }
                if (confirm === "approve-hold") {
                  void run(
                    () => approveComplianceRule(rule.id, reason.trim() || undefined, false),
                    "Approved and left inactive. Status is now {status}.",
                  );
                }
                if (confirm === "activate") {
                  void run(() => activateComplianceRule(rule.id, reason.trim() || undefined), "Activated. Status is now {status}.");
                }
                if (confirm === "deactivate") {
                  void run(() => deactivateComplianceRule(rule.id, reason.trim()), "Deactivated. Status is now {status}.");
                }
                if (confirm === "archive") {
                  void run(
                    () => archiveComplianceRule(rule.id, reason.trim() || undefined),
                    "Archived. Status is now {status}.",
                  );
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
            ? "Deactivating stops this rule from applying to future collection activity. A reason is required."
            : confirm === "approve-hold"
              ? "This approves the rule and leaves it inactive. There is no scheduled activation date on the server. Activate it later when it should take effect."
              : confirm === "archive"
                ? "Archiving removes the rule from the active list. An active rule has to be deactivated first."
                : "The rule status updates after the server confirms the change."}
        </p>
        {confirm === "deactivate" || confirm === "submit" || confirm === "approve" || confirm === "approve-hold" || confirm === "archive" ? (
          <label className="mt-3 block text-[13px]">
            Reason{confirm === "deactivate" ? "" : " (optional)"}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
          </label>
        ) : null}
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
