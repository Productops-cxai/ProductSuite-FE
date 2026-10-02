import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activatePayflowRule,
  deactivatePayflowRule,
  getPayflowRule,
} from "../../api/payflow";
import {
  Btn,
  KpiCard,
  PageHeader,
  Panel,
  StatusPill,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowRule } from "../../types";

function ruleStatusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "Draft") return "warning";
  return "neutral";
}

export function PayFlowRuleDetailPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const [rule, setRule] = useState<PayflowRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const id = Number(ruleId);
    if (!Number.isFinite(id)) {
      setError("Rule not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setRule(await getPayflowRule(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load rule");
      setRule(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId]);

  async function onActivate() {
    if (!rule) return;
    setBusy(true);
    try {
      setRule(await activatePayflowRule(rule.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Activate failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate() {
    if (!rule) return;
    setBusy(true);
    try {
      setRule(await deactivatePayflowRule(rule.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Deactivate failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading rule…</p>;
  if (error && !rule) {
    return (
      <Panel title="Rule not available">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/payflow/rules" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to rules
        </Link>
      </Panel>
    );
  }
  if (!rule) return null;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Rules", to: "/payflow/rules" },
          { label: rule.name },
        ]}
        title={rule.name}
        description={rule.description || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={ruleStatusTone(rule.status)}>{rule.status}</StatusPill>
            <StatusPill>{rule.rule_type}</StatusPill>
            {rule.can_edit && rule.status !== "Active" ? (
              <Btn variant="primary" disabled={busy} onClick={() => void onActivate()}>
                Activate
              </Btn>
            ) : null}
            {rule.can_edit && rule.status === "Active" ? (
              <Btn disabled={busy} onClick={() => void onDeactivate()}>
                Deactivate
              </Btn>
            ) : null}
          </div>
        }
      />

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Category" value={rule.category} />
        <KpiCard label="Result" value={rule.action} />
        <KpiCard label="Triggers · 7d" value={String(rule.triggers_7d)} tone="primary" />
        <KpiCard
          label="Conditions"
          value={`${rule.conditions?.length || 0} · ${rule.logic}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Panel title="Conditions">
            <ul className="space-y-2 text-[13px]">
              {(rule.conditions || []).map((c, i) => (
                <li key={c.id || `${c.field}-${i}`} className="rounded-md border border-border px-3 py-2">
                  {i > 0 ? (
                    <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {rule.logic}
                    </span>
                  ) : null}
                  <span className="font-medium">{c.field}</span>{" "}
                  <span className="text-muted-foreground">{c.operator.toLowerCase()}</span>{" "}
                  <span className="font-medium">{c.value}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Where This Rule Is Used">
            {(rule.applied_to || []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No client applications recorded.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {rule.applied_to.map((code) => (
                  <li key={code} className="text-muted-foreground">
                    {code}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent Triggers">
            {(rule.recent_triggers || []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No recent human reviews for this rule.</p>
            ) : (
              <ul className="space-y-2">
                {rule.recent_triggers!.map((t) => (
                  <li key={t.review_id} className="flex items-center justify-between gap-3 text-[13px]">
                    <Link
                      to={`/payflow/review/${t.review_id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {t.customer_name} · {t.account_reference}
                    </Link>
                    <StatusPill>{t.status}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Rule Summary">
            <p className="text-[13px] text-muted-foreground">{rule.condition_summary}</p>
            <p className="mt-3 text-[13px]">
              <span className="text-muted-foreground">Then · </span>
              <strong>{rule.action}</strong>
            </p>
          </Panel>

          <Panel title="Details">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Created by</dt>
                <dd className="font-medium">{rule.created_by || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="font-medium">{rule.last_updated_label || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium">
                  {rule.client_id ? (
                    <Link
                      to={`/payflow/clients/${rule.client_id}`}
                      className="text-primary hover:underline"
                    >
                      {rule.client_name}
                    </Link>
                  ) : (
                    "All Clients"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Code</dt>
                <dd className="font-medium">{rule.code}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Change History">
            <ul className="space-y-2">
              {(rule.history || []).map((h, i) => (
                <li key={`${h.at}-${i}`} className="text-[13px]">
                  <p className="font-medium text-foreground">{h.change}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {h.at} · {h.by}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
