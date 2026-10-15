import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { createPayflowRule, listPayflowClients, listPayflowRules } from "../../api/payflow";
import {
  Btn,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { cn } from "../../lib/utils";
import type { PayflowClient, PayflowRuleCondition, PayflowRuleFieldCatalogItem } from "../../types";

const NUMERIC_OPS = [
  "Equals",
  "Does Not Equal",
  "Greater Than",
  "Greater Than or Equal To",
  "Less Than",
  "Less Than or Equal To",
];
const TEXT_OPS = ["Equals", "Does Not Equal", "Contains", "Does Not Contain"];
const ENUM_OPS = ["Is", "Is Not"];

function operatorsForField(fields: PayflowRuleFieldCatalogItem[], label: string) {
  const field = fields.find((f) => f.label === label);
  if (!field) return NUMERIC_OPS;
  if (field.type === "text") return TEXT_OPS;
  if (field.type === "enum") return ENUM_OPS;
  return NUMERIC_OPS;
}

function newCondition(fields: PayflowRuleFieldCatalogItem[]): PayflowRuleCondition {
  const field = fields[0]?.label || "Outstanding Balance";
  return {
    id: `cond-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    field,
    operator: operatorsForField(fields, field)[0] || "Equals",
    value: "",
  };
}

function valueHint(field?: PayflowRuleFieldCatalogItem) {
  if (!field || field.type === "enum" || field.type === "text") return undefined;
  if (/(balance|amount|payment|fee|principal|usd)/i.test(field.label)) return "Amount in USD";
  return undefined;
}

function conditionHasValue(condition: PayflowRuleCondition, fields: PayflowRuleFieldCatalogItem[]) {
  if (String(condition.value || "").trim()) return true;
  const meta = fields.find((f) => f.label === condition.field);
  return meta?.type === "enum" && !!meta.options?.length;
}

function SaveNotice({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-[#eadcc0] bg-[#fbf6ec] px-3 py-2.5 text-center text-[13px] font-medium text-[#6d5630] dark:border-warning/35 dark:bg-warning/10 dark:text-warning-foreground">
      {children}
    </div>
  );
}

export function PayFlowRuleNewPage() {
  const navigate = useNavigate();
  const { isOperationsAdmin } = usePayFlowAccess();
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [fields, setFields] = useState<PayflowRuleFieldCatalogItem[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState(isOperationsAdmin ? "System Rule" : "Client Rule");
  const [clientId, setClientId] = useState<string>("");
  const [category, setCategory] = useState("");
  const [logic, setLogic] = useState("ALL");
  const [action, setAction] = useState("");
  const [conditions, setConditions] = useState<PayflowRuleCondition[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listPayflowRules({}), listPayflowClients({})])
      .then(([ruleRes, clientRes]) => {
        if (cancelled) return;
        setCanCreate(!!ruleRes.can_create);
        setCategories(ruleRes.categories || []);
        setActions(ruleRes.actions || []);
        setFields(ruleRes.fields || []);
        setClients(clientRes.clients || []);
        setCategory(ruleRes.categories?.[0] || "");
        setAction(ruleRes.actions?.[0] || "");
        setConditions([newCondition(ruleRes.fields || [])]);
        if (!isOperationsAdmin) setRuleType("Client Rule");
        const firstClient = clientRes.clients?.[0];
        if (firstClient) setClientId(String(firstClient.id));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load rule builder");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOperationsAdmin]);

  function updateCondition(index: number, patch: Partial<PayflowRuleCondition>) {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...patch };
        if (patch.field) {
          next.operator = operatorsForField(fields, patch.field)[0] || next.operator;
        }
        return next;
      }),
    );
  }

  async function submit(status: "Draft" | "Active") {
    setBusy(true);
    setError("");
    try {
      const created = await createPayflowRule({
        name: name.trim(),
        description: description.trim() || undefined,
        rule_type: ruleType,
        client_id: ruleType === "Client Rule" ? Number(clientId) : null,
        category,
        logic,
        conditions: conditions.map((c) => ({
          id: c.id || undefined,
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        action,
        status,
      });
      navigate(`/payflow/rules/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create rule");
    } finally {
      setBusy(false);
    }
  }

  const saveChecks = [
    !name.trim() ? "Rule name is required" : "",
    conditions.some((c) => !conditionHasValue(c, fields)) ? "Every condition needs a value" : "",
    ruleType === "Client Rule" && !clientId ? "Client is required" : "",
  ].filter(Boolean);

  const canSubmit = !busy && !!name.trim();

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!canCreate) {
    return (
      <Panel title="Cannot create rules">
        <p className="text-sm text-muted-foreground">
          Creating rules requires the <strong>Create / Edit Client Rules</strong> permission (or
          Operations Admin for system rules).
        </p>
        <Link to="/payflow/rules" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to rules
        </Link>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Rules", to: "/payflow/rules" },
          { label: "Create Rule" },
        ]}
        title="Create Rule"
        description="Configure a structured condition and the action PayFlow should take when it is met."
        actions={
          <>
            <Btn variant="secondary" disabled={!canSubmit} onClick={() => void submit("Draft")}>
              {busy ? "Saving…" : "Save as Draft"}
            </Btn>
            <Btn variant="primary" disabled={!canSubmit} onClick={() => void submit("Active")}>
              Create & Activate
            </Btn>
          </>
        }
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.82fr)]">
        <div className="min-w-0 space-y-5">
          <Panel bodyClassName="space-y-4">
            <h2 className="text-[13.5px] font-semibold tracking-tight text-foreground">Rule Details</h2>
            <Field label="Rule Name">
              <TextInput value={name} onChange={setName} placeholder="High Balance Review" />
            </Field>
            <Field label="Description">
              <TextArea
                value={description}
                onChange={setDescription}
                rows={4}
                placeholder="Explain when this rule should apply and why."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="Rule Type">
                  <SelectInput
                    value={ruleType}
                    onChange={setRuleType}
                    options={isOperationsAdmin ? ["System Rule", "Client Rule"] : ["Client Rule"]}
                  />
                </Field>
                <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
                  {ruleType === "System Rule"
                    ? "System rules are reusable across clients."
                    : "Client rules apply only to the selected client."}
                </p>
              </div>
              <Field label="Category">
                <SelectInput value={category} onChange={setCategory} options={categories} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-[12px] font-medium text-foreground">Scope</span>
                {ruleType === "System Rule" ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary">
                    System / Available Globally
                  </span>
                ) : (
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground shadow-subtle outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/15"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </Panel>

          <Panel
            title="Conditions"
            description="Field, operator and value — no code required"
            bodyClassName="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                WHEN
              </span>
              <div role="radiogroup" aria-label="Match logic" className="flex items-center gap-1.5">
                {(
                  [
                    ["ALL", "All conditions"],
                    ["ANY", "Any condition"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={logic === value}
                    onClick={() => setLogic(value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors",
                      logic === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-[12.5px] text-muted-foreground">
                {logic === "ALL" ? "Every condition must be met." : "Any condition may be met."}
              </span>
            </div>

            <div className="space-y-3">
              {conditions.map((c, index) => {
                const fieldMeta = fields.find((f) => f.label === c.field);
                const ops = operatorsForField(fields, c.field);
                return (
                  <div key={c.id || index} className="rounded-lg bg-muted px-4 py-3.5">
                    {conditions.length > 1 ? (
                      <div className="mb-2 flex justify-end">
                        <button
                          type="button"
                          className="text-[12px] font-medium text-destructive hover:underline"
                          onClick={() => setConditions((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Field">
                        <SelectInput
                          value={c.field}
                          onChange={(v) => updateCondition(index, { field: v })}
                          options={fields.map((f) => f.label)}
                        />
                      </Field>
                      <Field label="Operator">
                        <SelectInput
                          value={c.operator}
                          onChange={(v) => updateCondition(index, { operator: v })}
                          options={ops}
                        />
                      </Field>
                      <Field label="Value" hint={valueHint(fieldMeta)}>
                        {fieldMeta?.type === "enum" && fieldMeta.options?.length ? (
                          <SelectInput
                            value={c.value || fieldMeta.options[0]}
                            onChange={(v) => updateCondition(index, { value: v })}
                            options={fieldMeta.options}
                          />
                        ) : (
                          <TextInput
                            value={c.value}
                            onChange={(v) => updateCondition(index, { value: v.replace(/\D/g, "") })}
                            placeholder={fieldMeta?.type === "text" ? "Value" : "0"}
                          />
                        )}
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>

            <Btn
              variant="secondary"
              onClick={() => setConditions((prev) => [...prev, newCondition(fields)])}
            >
              + Add Condition
            </Btn>

            <div className="max-w-md">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                THEN
              </span>
              <SelectInput value={action} onChange={setAction} options={actions} />
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel>
            <h2 className="text-[13.5px] font-semibold tracking-tight text-foreground">Rule Summary</h2>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              Human-readable view of the structured configuration
            </p>
            <div className="mt-4 rounded-lg bg-muted px-4 py-3.5">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">IF</p>
              <div className="mt-1.5 space-y-1.5">
                {conditions.length === 0 ? (
                  <p className="text-[13.5px] font-semibold text-foreground">No conditions</p>
                ) : (
                  conditions.map((c, index) => (
                    <div key={c.id || index}>
                      {index > 0 ? (
                        <p className="my-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
                          {logic === "ALL" ? "AND" : "OR"}
                        </p>
                      ) : null}
                      <p className="text-[13.5px] font-semibold leading-snug text-foreground">
                        {c.field} {c.operator.toLowerCase()} {c.value?.trim() ? c.value : "—"}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-3.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                THEN
              </p>
              <p className="mt-1.5 text-[13.5px] font-semibold text-foreground">{action || "—"}</p>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-[13.5px] font-semibold tracking-tight text-foreground">Before you save</h2>
            {saveChecks.length > 0 ? (
              <div className="mt-4 space-y-2">
                {saveChecks.map((check) => (
                  <SaveNotice key={check}>{check}</SaveNotice>
                ))}
              </div>
            ) : null}
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              Draft and inactive rules do not affect operations. Active rules participate in governance
              evaluation for their scope only.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
