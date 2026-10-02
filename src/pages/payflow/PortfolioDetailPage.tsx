import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getPayflowClientPortfolio,
  updatePayflowClientPortfolio,
} from "../../api/payflow";
import {
  Btn,
  EmptyState,
  Field,
  KpiCard,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { PayflowPortfolioDetail } from "../../types";

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

function strategyStatusTone(status: string): Tone {
  switch (status) {
    case "AI Proposed":
      return "ai";
    case "Under Review":
      return "warning";
    case "Approved":
      return "info";
    case "Active":
      return "success";
    default:
      return "neutral";
  }
}

function labelFromStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "onboarding") return "Onboarding";
  if (s === "active") return "Active";
  if (s === "paused") return "Paused";
  return status;
}

export function PayFlowPortfolioDetailPage() {
  const { clientId, portfolioId } = useParams();
  const { isOperationsAdmin } = usePayFlowAccess();
  const cid = Number(clientId);
  const pid = Number(portfolioId);

  const [detail, setDetail] = useState<PayflowPortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Onboarding");
  const [description, setDescription] = useState("");

  async function load() {
    if (!Number.isFinite(cid) || !Number.isFinite(pid)) return;
    setLoading(true);
    setError("");
    try {
      const p = await getPayflowClientPortfolio(cid, pid);
      setDetail(p);
      setName(p.name);
      setCode(p.code);
      setStatus(labelFromStatus(p.status));
      setDescription(p.description || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load portfolio");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [cid, pid]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!detail || !isOperationsAdmin) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const updated = await updatePayflowClientPortfolio(cid, pid, {
        name: name.trim(),
        code: code.trim(),
        status: status.toLowerCase(),
        description: description.trim() || undefined,
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              strategies: prev.strategies,
              client_name: prev.client_name,
              client_code: prev.client_code,
            }
          : prev,
      );
      setInfo("Changes saved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save portfolio");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading portfolio…</p>;
  }

  if (!detail) {
    return (
      <Panel title="Portfolio not found">
        <p className="text-sm text-muted-foreground">{error || "This portfolio is unavailable."}</p>
        <Link
          to={Number.isFinite(cid) ? `/payflow/clients/${cid}?tab=${encodeURIComponent("Sub-Clients / Portfolios")}` : "/payflow/clients"}
          className="mt-3 inline-block text-[13px] font-medium text-primary"
        >
          Back to client
        </Link>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Clients", to: "/payflow/clients" },
          { label: detail.client_name, to: `/payflow/clients/${cid}` },
          { label: detail.name },
        ]}
        title={detail.name}
        description={`${detail.client_name} > ${detail.name} · ${detail.description || "Sub-client portfolio"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/payflow/clients/${cid}?tab=${encodeURIComponent("Sub-Clients / Portfolios")}`}
              className="text-[12.5px] font-semibold text-primary hover:underline"
            >
              ← Back to portfolios
            </Link>
            <StatusPill tone={portfolioStatusTone(detail.status)} dot>
              {detail.status_label || labelFromStatus(detail.status)}
            </StatusPill>
            <StatusPill>{detail.code}</StatusPill>
          </div>
        }
      />

      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="mb-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
          {info}
        </p>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customer Accounts" value={formatNumber(detail.account_count ?? 0)} />
        <KpiCard label="Collection Cases" value={formatNumber(detail.case_count ?? 0)} />
        <KpiCard label="Outstanding" value={formatCurrency(detail.outstanding ?? 0)} />
        <KpiCard
          label="Latest File Received"
          value={detail.last_file_received || "No file received yet"}
          hint="Population changes with every file"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Portfolio details"
          description="Name, reference and status for this sub-client portfolio."
        >
          <form onSubmit={(e) => void save(e)} className="grid gap-3 sm:grid-cols-2">
            <Field label="Portfolio Name">
              <TextInput
                value={name}
                onChange={setName}
                disabled={!isOperationsAdmin}
              />
            </Field>
            <Field label="Portfolio Code / Reference">
              <TextInput
                value={code}
                onChange={setCode}
                disabled={!isOperationsAdmin}
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={status}
                options={[...STATUS_OPTIONS]}
                onChange={setStatus}
                disabled={!isOperationsAdmin}
              />
            </Field>
            <Field label="Description">
              <TextInput
                value={description}
                onChange={setDescription}
                placeholder="Optional notes"
                disabled={!isOperationsAdmin}
              />
            </Field>
            {isOperationsAdmin ? (
              <div className="sm:col-span-2">
                <Btn variant="primary" disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </Btn>
              </div>
            ) : null}
          </form>
        </Panel>

        <Panel
          title="Strategies / Workflows for this portfolio"
          description="Portfolios may run different strategies from their parent client."
          action={
            <Link to="/payflow/workflows">
              <Btn>All strategies</Btn>
            </Link>
          }
        >
          {(detail.strategies || []).length === 0 ? (
            <EmptyState
              title="No strategy applied yet"
              description="PayFlow proposes a strategy once enough portfolio, payment and engagement context is available."
            />
          ) : (
            <ul className="space-y-2">
              {detail.strategies.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/payflow/workflows/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{s.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {s.origin || "Strategy"} · v{s.version ?? 1}
                        {s.updated_at
                          ? ` · updated ${new Date(s.updated_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <StatusPill tone={strategyStatusTone(s.status)} dot>
                      {s.status}
                    </StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
