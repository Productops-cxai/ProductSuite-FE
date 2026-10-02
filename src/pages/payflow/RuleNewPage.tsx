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
        conditions,
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
        description="Define when PayFlow should require human review, hold an action, or escalate a case."
      />

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Panel title="Basics">
            <div className="space-y-3">
              <Field label="Rule name">
                <TextInput value={name} onChange={setName} placeholder="e.g. High Balance Review" />
              </Field>
              <Field label="Description">
                <TextArea value={description} onChange={setDescription} rows={3} />
              </Field>
              <Field label="Type">
                <SelectInput
                  value={ruleType}
                  onChange={setRuleType}
                  options={
                    isOperationsAdmin ? ["System Rule", "Client Rule"] : ["Client Rule"]
                  }
                />
              </Field>
              {ruleType === "Client Rule" ? (
                <Field label="Client">
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Category">
                <SelectInput value={category} onChange={setCategory} options={categories} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Conditions"
            action={
              <Btn
                variant="ghost"
                onClick={() => setConditions((prev) => [...prev, newCondition(fields)])}
              >
                Add condition
              </Btn>
            }
          >
            <Field label="Match logic" className="mb-3">
              <SelectInput value={logic} onChange={setLogic} options={["ALL", "ANY"]} />
            </Field>
            <div className="space-y-3">
              {conditions.map((c, index) => {
                const fieldMeta = fields.find((f) => f.label === c.field);
                const ops = operatorsForField(fields, c.field);
                return (
                  <div key={c.id || index} className="rounded-md border border-border p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <SelectInput
                        value={c.field}
                        onChange={(v) => updateCondition(index, { field: v })}
                        options={fields.map((f) => f.label)}
                      />
                      <SelectInput
                        value={c.operator}
                        onChange={(v) => updateCondition(index, { operator: v })}
                        options={ops}
                      />
                      {fieldMeta?.type === "enum" && fieldMeta.options?.length ? (
                        <SelectInput
                          value={c.value || fieldMeta.options[0]}
                          onChange={(v) => updateCondition(index, { value: v })}
                          options={fieldMeta.options}
                        />
                      ) : (
                        <TextInput
                          value={c.value}
                          onChange={(v) => updateCondition(index, { value: v })}
                          placeholder="Value"
                        />
                      )}
                    </div>
                    {conditions.length > 1 ? (
                      <button
                        type="button"
                        className="mt-2 text-[12px] text-destructive hover:underline"
                        onClick={() =>
                          setConditions((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Result">
            <Field label="Action">
              <SelectInput value={action} onChange={setAction} options={actions} />
            </Field>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Summary">
            <p className="text-[13px] text-muted-foreground">
              {conditions
                .map((c) => `${c.field} ${c.operator.toLowerCase()} ${c.value || "—"}`)
                .join(logic === "ALL" ? " AND " : " OR ") || "No conditions"}
            </p>
            <p className="mt-3 text-[13px]">
              <span className="text-muted-foreground">Then · </span>
              <strong>{action || "—"}</strong>
            </p>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Btn
              variant="primary"
              disabled={busy || !name.trim()}
              onClick={() => void submit("Draft")}
            >
              {busy ? "Saving…" : "Save as Draft"}
            </Btn>
            <Btn
              disabled={busy || !name.trim()}
              onClick={() => void submit("Active")}
            >
              Create & Activate
            </Btn>
            <Link to="/payflow/rules">
              <Btn variant="ghost">Cancel</Btn>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
