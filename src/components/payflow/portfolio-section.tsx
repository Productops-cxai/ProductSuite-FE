import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { deletePayflowClientPortfolio } from "../../api/payflow";
import { ConfirmDelete } from "../ui/ConfirmDelete";
import {
  Btn,
  DataTable,
  EmptyState,
  Field,
  Panel,
  PrimaryCell,
  SelectInput,
  StatusPill,
  Td,
  TextInput,
  Tr,
  type Tone,
} from "./lovable/payflow-ui";
import type { PayflowPortfolio } from "../../types";

const STATUS_OPTIONS = ["Onboarding", "Active", "Paused"] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function portfolioStatusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "onboarding") return "info";
  if (s === "paused") return "warning";
  return "neutral";
}

function toApiStatus(label: string) {
  return label.trim().toLowerCase();
}

function statusLabel(p: PayflowPortfolio) {
  return p.status_label || p.status.charAt(0).toUpperCase() + p.status.slice(1);
}

export function PortfolioSection({
  clientId,
  clientName,
  portfolios,
  canEdit,
  busy,
  onAdd,
  onError,
  onDeleted,
}: {
  clientId: number;
  clientName: string;
  portfolios: PayflowPortfolio[];
  canEdit: boolean;
  busy?: boolean;
  onAdd: (payload: { name: string; code: string; status: string }) => Promise<void>;
  onError?: (message: string) => void;
  onDeleted?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string>("Onboarding");
  const [pendingDelete, setPendingDelete] = useState<PayflowPortfolio | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!name.trim()) {
      onError?.("Portfolio name is required");
      return;
    }
    try {
      await onAdd({
        name: name.trim(),
        code: code.trim() || `PF-${String(portfolios.length + 1).padStart(2, "0")}`,
        status: toApiStatus(status),
      });
      setName("");
      setCode("");
      setStatus("Onboarding");
      setAdding(false);
    } catch {
      // Parent surfaces the error message.
    }
  }

  async function confirmPortfolioDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deletePayflowClientPortfolio(clientId, pendingDelete.id);
      setPendingDelete(null);
      onDeleted?.();
    } catch (err) {
      onError?.(err instanceof ApiError ? err.detail : "Failed to delete portfolio");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-muted-foreground">
          A sub-client / portfolio is a distinct collection portfolio belonging to {clientName}. Each
          portfolio can hold a different account population and run different strategies. Portfolios
          are not customer accounts.
        </p>
        {canEdit ? (
          <Btn variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "+ Add Sub-Client / Portfolio"}
          </Btn>
        ) : null}
      </div>

      {adding && canEdit ? (
        <Panel title="Add Sub-Client / Portfolio">
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Portfolio Name">
                <TextInput value={name} onChange={setName} placeholder={`${clientName} Loans`} />
              </Field>
              <Field label="Portfolio Code / Reference">
                <TextInput value={code} onChange={setCode} placeholder="PF-05" />
              </Field>
              <Field label="Status">
                <SelectInput
                  value={status}
                  options={[...STATUS_OPTIONS]}
                  onChange={setStatus}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Btn variant="primary" disabled={busy || !name.trim()} onClick={() => void submit()}>
                {busy ? "Adding…" : "Add portfolio"}
              </Btn>
              <Btn
                onClick={() => {
                  setAdding(false);
                  setName("");
                  setCode("");
                  setStatus("Onboarding");
                }}
              >
                Cancel
              </Btn>
            </div>
          </form>
        </Panel>
      ) : null}

      {portfolios.length === 0 ? (
        <EmptyState
          title="No portfolios yet"
          description={`Add the first collection portfolio for ${clientName}.`}
          action={
            canEdit && !adding ? (
              <Btn variant="primary" onClick={() => setAdding(true)}>
                + Add Sub-Client / Portfolio
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          minWidth={900}
          head={[
            "Portfolio",
            "Reference",
            "Status",
            "Accounts / Cases",
            "Outstanding",
            "Active Strategy",
            "",
          ]}
        >
          {portfolios.map((p) => (
            <Tr key={p.id}>
              <Td>
                <Link to={`/payflow/clients/${clientId}/portfolios/${p.id}`}>
                  <PrimaryCell
                    title={
                      <span className="text-primary hover:underline">
                        {clientName} &gt; {p.name}
                      </span>
                    }
                    subtitle={
                      p.crm_client_number
                        ? `CRM #${p.crm_client_number}${p.description ? ` · ${p.description}` : ""}`
                        : p.description || "Portfolio under this client"
                    }
                  />
                </Link>
              </Td>
              <Td className="tabular text-muted-foreground">{p.code}</Td>
              <Td>
                <StatusPill tone={portfolioStatusTone(p.status)} dot>
                  {statusLabel(p)}
                </StatusPill>
              </Td>
              <Td className="tabular">
                {formatNumber(p.account_count ?? 0)} / {formatNumber(p.case_count ?? 0)}
              </Td>
              <Td className="tabular font-medium">
                {formatCurrency(p.outstanding ?? 0)}
              </Td>
              <Td className="text-muted-foreground">
                {p.active_strategy_id && p.active_strategy_name ? (
                  <Link
                    to={`/payflow/workflows/${p.active_strategy_id}`}
                    className="text-primary hover:underline"
                  >
                    {p.active_strategy_name}
                  </Link>
                ) : (
                  "None applied"
                )}
              </Td>
              <Td>
                <div className="flex flex-col items-end gap-1">
                  <Link
                    to={`/payflow/clients/${clientId}/portfolios/${p.id}`}
                    className="text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    View details
                  </Link>
                  {canEdit ? (
                    <button
                      type="button"
                      className="text-[12.5px] font-semibold text-destructive hover:underline"
                      onClick={() => setPendingDelete(p)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete portfolio?"}
        description="This deletes the portfolio and its accounts, cases, reviews, communications, and workflows. The action is logged."
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmPortfolioDelete()}
      />
    </div>
  );
}
