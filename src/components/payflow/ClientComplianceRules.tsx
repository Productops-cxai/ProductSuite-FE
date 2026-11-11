import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getApplicableComplianceRules,
  saveClientComplianceSelections,
} from "../../api/compliance";
import { Btn, StatusPill } from "./lovable/payflow-ui";
import { complianceStatusTone } from "./ComplianceRuleForm";
import type { ComplianceApplicableRule } from "../../types";

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
  /** When true, the panel writes the selection to the client immediately. */
  persist?: boolean;
  onSelectionChange?: (selectedOptionalIds: number[]) => void;
}) {
  const [rules, setRules] = useState<ComplianceApplicableRule[]>([]);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const placeKey = [clientId ?? "", country, provinceState, city, postalCode].join("|");

  useEffect(() => {
    if (!country.trim() && clientId == null) {
      setRules([]);
      setLabel("");
      setSupported(false);
      setMessage("Add a country on the client profile to identify applicable compliance rules.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setNotice("");
    getApplicableComplianceRules({
      clientId,
      country,
      state: provinceState,
      city,
      postal: postalCode,
    })
      .then((res) => {
        if (cancelled) return;
        setRules(res.rules || []);
        setLabel(res.jurisdiction_label || "");
        setSupported(res.supported);
        setMessage(res.message || "");
        onSelectionChange?.(
          (res.rules || []).filter((rule) => rule.selected && rule.classification !== "Mandatory").map((rule) => rule.id),
        );
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
    // onSelectionChange is intentionally omitted so parent identity changes do not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);

  function selectedOptionalIds(next: ComplianceApplicableRule[]) {
    return next.filter((rule) => rule.selected && rule.classification !== "Mandatory").map((rule) => rule.id);
  }

  function toggle(rule: ComplianceApplicableRule) {
    const mandatory = rule.classification === "Mandatory";
    if (mandatory && (!canEditMandatory || rule.locked)) return;
    if (!mandatory && !canEditOptional) return;
    const next = rules.map((item) => (item.id === rule.id ? { ...item, selected: !item.selected } : item));
    setRules(next);
    setNotice("");
    onSelectionChange?.(selectedOptionalIds(next));
  }

  async function save() {
    if (clientId == null) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await saveClientComplianceSelections(clientId, {
        selected_optional_ids: selectedOptionalIds(rules),
        use_defaults: false,
      });
      setRules(res.rules || []);
      setNotice("Compliance rule selections saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not save compliance rule selections.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = rules.filter((rule) => rule.selected).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Compliance rules
            {rules.length ? ` · ${selectedCount} selected` : ""}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {label || "Jurisdiction comes from the client address."} Mandatory rules stay enforced unless you can modify governance.
          </p>
        </div>
        {persist && clientId != null && canEditOptional ? (
          <Btn onClick={() => void save()} disabled={busy || loading}>
            Save rule selections
          </Btn>
        ) : null}
      </div>
      {loading ? <p className="text-[13px] text-muted-foreground">Loading applicable rules…</p> : null}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
      {notice ? <p className="text-[13px] text-success">{notice}</p> : null}
      {!loading && message ? <p className="text-[13px] text-muted-foreground">{message}</p> : null}
      {!loading && supported && !error && rules.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No active compliance rules match this jurisdiction.
        </p>
      ) : null}
      {!loading && rules.length > 0 ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {rules.map((rule) => {
            const mandatory = rule.classification === "Mandatory";
            const locked = mandatory ? !canEditMandatory || rule.locked : !canEditOptional;
            return (
              <div key={rule.id} className="flex flex-wrap items-start gap-3 px-3 py-3">
                <label className="flex min-w-0 flex-1 items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-3.5 accent-[var(--color-primary)]"
                    checked={rule.selected}
                    disabled={locked}
                    aria-label={`Select ${rule.name}`}
                    onChange={() => toggle(rule)}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{rule.name}</span>
                      <StatusPill tone={mandatory ? "info" : "neutral"}>
                        {mandatory ? "Mandatory · enforced" : rule.classification}
                      </StatusPill>
                      {rule.newly_applicable ? <StatusPill tone="warning">Newly applicable</StatusPill> : null}
                      <StatusPill tone={complianceStatusTone(rule.status)}>{rule.status}</StatusPill>
                    </span>
                    <span className="mt-1 block text-[12px] text-muted-foreground">
                      {rule.code} · {rule.category} · {rule.jurisdiction_label} · {rule.channel_label}
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
