import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getClientComplianceRules,
  previewActiveComplianceRules,
  updateClientComplianceRule,
} from "../../api/compliance";
import type { ClientComplianceChoice } from "../../types";
import { Btn, StatusPill } from "./lovable/payflow-ui";
import { complianceStatusTone } from "./ComplianceRuleForm";

interface ShownRule {
  id: number;
  code: string;
  name: string;
  category: string;
  enforcement: string;
  status: string;
  channel: string;
  place: string;
  enabled: boolean;
  savedEnabled: boolean;
  locked: boolean;
}

export function ClientComplianceRulesPanel({
  clientId,
  country,
  provinceState,
  city,
  postalCode,
  canEditOptional,
  canEditMandatory,
  persist,
  onSelectionChange,
}: {
  clientId?: number | null;
  country: string;
  provinceState: string;
  city: string;
  postalCode: string;
  canEditOptional: boolean;
  canEditMandatory: boolean;
  /** When true, Save writes each changed rule with POST .../compliance-rules/update. */
  persist?: boolean;
  onSelectionChange?: (selection: ClientComplianceChoice[]) => void;
}) {
  const [rules, setRules] = useState<ShownRule[]>([]);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  const placeKey = [clientId ?? "", country, provinceState, city, postalCode].join("|");

  useEffect(() => {
    if (clientId == null && !country.trim()) {
      setRules([]);
      setLabel("");
      setPreview(false);
      setMessage("Add a country on the client profile to identify applicable compliance rules.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setNotice("");
    const load =
      clientId != null
        ? getClientComplianceRules(clientId).then((res) => {
            const place = res.jurisdiction;
            return {
              preview: false,
              label: [place?.country, place?.state, place?.city, place?.postal].filter(Boolean).join(" · "),
              message: res.jurisdiction_resolved
                ? res.message || ""
                : res.message || "This client has no country yet, so no jurisdiction rules are linked.",
              rules: (res.rules || []).map((rule) => ({
                id: rule.id,
                code: rule.code,
                name: rule.name,
                category: rule.category,
                enforcement: rule.enforcement,
                status: rule.status,
                channel: rule.channel || "All Channels",
                place: [rule.country, rule.state, rule.city].filter(Boolean).join(" · "),
                enabled: rule.enabled,
                savedEnabled: rule.enabled,
                locked: rule.locked || rule.enforcement === "Mandatory",
              })),
            };
          })
        : previewActiveComplianceRules(country, provinceState).then((rows) => ({
            preview: true,
            label: [country, provinceState, city, postalCode].filter(Boolean).join(" · "),
            message:
              "Preview of active rules for this country and state. Saving the client links the jurisdiction rules, including any you leave selected.",
            rules: rows.map((rule) => ({
              id: rule.id,
              code: rule.code,
              name: rule.name,
              category: rule.category,
              enforcement: rule.enforcement,
              status: rule.status,
              channel: rule.channel || "All Channels",
              place: [rule.country, rule.state, rule.city].filter(Boolean).join(" · "),
              enabled: true,
              savedEnabled: true,
              locked: rule.enforcement === "Mandatory",
            })),
          }));

    load
      .then((res) => {
        if (cancelled) return;
        setRules(res.rules);
        setLabel(res.label);
        setPreview(res.preview);
        setMessage(res.message);
      })
      .catch((err) => {
        if (cancelled) return;
        setRules([]);
        setError(err instanceof ApiError ? err.detail : "Failed to load applicable compliance rules.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placeKey, clientId, country, provinceState, city, postalCode]);

  function emit(next: ShownRule[]) {
    onSelectionChange?.(
      next.filter((rule) => !rule.locked).map((rule) => ({ ruleId: rule.id, enabled: rule.enabled })),
    );
  }

  function toggle(rule: ShownRule) {
    if (rule.locked || (rule.enforcement === "Mandatory" && !canEditMandatory)) return;
    if (!rule.locked && !canEditOptional) return;
    const next = rules.map((item) => (item.id === rule.id ? { ...item, enabled: !item.enabled } : item));
    setRules(next);
    setNotice("");
    emit(next);
  }

  async function save() {
    if (clientId == null) return;
    const reasonText = reason.trim();
    const changed = rules.filter((rule) => !rule.locked && rule.enabled !== rule.savedEnabled);
    if (!changed.length) {
      setNotice("No compliance rule changes to save.");
      return;
    }
    if (!reasonText) {
      setError("A reason is required to change a client's compliance rules.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const rule of changed) {
        await updateClientComplianceRule(clientId, {
          rule_id: rule.id,
          enabled: rule.enabled,
          reason: reasonText,
        });
      }
      const res = await getClientComplianceRules(clientId);
      const next = (res.rules || []).map((rule) => ({
        id: rule.id,
        code: rule.code,
        name: rule.name,
        category: rule.category,
        enforcement: rule.enforcement,
        status: rule.status,
        channel: rule.channel || "All Channels",
        place: [rule.country, rule.state, rule.city].filter(Boolean).join(" · "),
        enabled: rule.enabled,
        savedEnabled: rule.enabled,
        locked: rule.locked || rule.enforcement === "Mandatory",
      }));
      setRules(next);
      setReason("");
      setNotice("Compliance rule selections saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not save compliance rule selections.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = rules.filter((rule) => rule.enabled).length;
  const dirty = rules.some((rule) => !rule.locked && rule.enabled !== rule.savedEnabled);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Compliance rules
            {rules.length ? ` · ${selectedCount} on` : ""}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {label || "Jurisdiction comes from the client address."} Mandatory rules stay enforced.
            {canEditMandatory ? "" : " Optional rules can be changed with governance access."}
          </p>
        </div>
        {persist && clientId != null && canEditOptional ? (
          <Btn onClick={() => void save()} disabled={busy || loading || !dirty}>
            Save rule selections
          </Btn>
        ) : null}
      </div>
      {persist && dirty ? (
        <label className="block text-[13px] text-foreground">
          Reason for this change
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-border px-3 py-2"
          />
        </label>
      ) : null}
      {loading ? <p className="text-[13px] text-muted-foreground">Loading applicable rules…</p> : null}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
      {notice ? <p className="text-[13px] text-success">{notice}</p> : null}
      {!loading && message ? <p className="text-[13px] text-muted-foreground">{message}</p> : null}
      {!loading && !error && rules.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {preview
            ? "No active compliance rules match this country and state."
            : "No compliance rules are linked for this client."}
        </p>
      ) : null}
      {!loading && rules.length > 0 ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {rules.map((rule) => {
            const mandatory = rule.locked || rule.enforcement === "Mandatory";
            const disabled = mandatory || !canEditOptional;
            return (
              <div key={rule.id} className="flex flex-wrap items-start gap-3 px-3 py-3">
                <label className="flex min-w-0 flex-1 items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-3.5 accent-[var(--color-primary)]"
                    checked={rule.enabled}
                    disabled={disabled}
                    aria-label={`${rule.enabled ? "Turn off" : "Turn on"} ${rule.name}`}
                    onChange={() => toggle(rule)}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{rule.name}</span>
                      <StatusPill tone={mandatory ? "info" : "neutral"}>
                        {mandatory ? "Mandatory · enforced" : rule.enforcement || "Optional"}
                      </StatusPill>
                      <StatusPill tone={complianceStatusTone(rule.status)}>{rule.status}</StatusPill>
                    </span>
                    <span className="mt-1 block text-[12px] text-muted-foreground">
                      {rule.code} · {rule.category} · {rule.place || "—"} · {rule.channel}
                    </span>
                  </span>
                </label>
                <Link
                  to={`/payflow/compliance-rules/${rule.id}`}
                  className="text-[12.5px] font-semibold text-primary hover:underline"
                >
                  View rule
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
