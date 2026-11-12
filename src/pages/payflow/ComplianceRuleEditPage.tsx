import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getComplianceRule } from "../../api/compliance";
import { ComplianceRuleForm, emptyComplianceDraft } from "../../components/payflow/ComplianceRuleForm";
import { PageHeader, Panel } from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { draftFromApiRule } from "../../lib/compliance-rule";
import type { ComplianceApiRule, ComplianceRuleWrite } from "../../types";

export function PayFlowComplianceRuleEditPage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const { hasPermission, isOperationsAdmin } = usePayFlowAccess();
  const editing = Boolean(ruleId);
  const [initial, setInitial] = useState<ComplianceRuleWrite | null>(editing ? null : emptyComplianceDraft());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ruleId) return;
    let cancelled = false;
    getComplianceRule(Number(ruleId))
      .then((rule) => {
        if (cancelled) return;
        const canEdit =
          hasPermission("modify_governance") &&
          rule.status !== "Archived" &&
          (rule.status !== "Active" || isOperationsAdmin);
        setInitial(draftFromApiRule(rule));
        setStatus(rule.status);
        if (!canEdit) setError("Your role cannot edit compliance rules.");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load the compliance rule.");
      });
    return () => {
      cancelled = true;
    };
  }, [ruleId, hasPermission, isOperationsAdmin]);

  function saved(rule: ComplianceApiRule) {
    navigate(`/payflow/compliance-rules/${rule.id}`, { state: { savedStatus: rule.status } });
  }

  const form = initial ? (
    <ComplianceRuleForm
      mode={editing ? "edit" : "create"}
      ruleId={ruleId ? Number(ruleId) : undefined}
      initial={initial}
      activeWarning={status === "Active"}
      allowDraft={!editing || status === "Draft" || status === "Inactive"}
      disabled={Boolean(error)}
      onSaved={saved}
    />
  ) : null;

  if (!editing) {
    return (
      <>
        <PageHeader
          breadcrumb={[
            { label: "Compliance Rules", to: "/payflow/compliance-rules" },
            { label: "New Rule" },
          ]}
          title="Add Compliance Rule"
        />
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {form}
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Compliance Rules", to: "/payflow/compliance-rules" },
          initial?.name
            ? { label: initial.name, to: `/payflow/compliance-rules/${ruleId}` }
            : { label: "Edit" },
        ]}
        title="Edit Compliance Rule"
        description="Configure the jurisdiction, applicability, and enforcement for this collection restriction."
      />
      {error && !initial ? <p className="text-sm text-destructive">{error}</p> : null}
      {!initial ? <p className="text-sm text-muted-foreground">Loading rule…</p> : null}
      {initial ? (
        <Panel title={initial.name || "Rule"}>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {form}
        </Panel>
      ) : null}
    </>
  );
}
