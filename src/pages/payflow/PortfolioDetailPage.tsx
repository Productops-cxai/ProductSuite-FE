import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getPayflowClientPortfolio,
  updatePayflowClientPortfolio,
  deletePayflowClientPortfolio,
  previewPayflowPortfolioSegments,
  suggestPayflowWorkflows,
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
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import { SHOW_PAYFLOW_DELETE } from "../../lib/payflow-features";
import type { PayflowPortfolioDetail } from "../../types";

type SegmentPreview = Awaited<ReturnType<typeof previewPayflowPortfolioSegments>>;

const STATUS_OPTIONS = ["Onboarding", "Active", "Paused"] as const;

const EXCLUDED_LABELS: Record<string, string> = {
  closed: "closed",
  resolved: "resolved",
  human_review: "in human review",
  on_hold: "on hold",
  no_balance: "no outstanding balance",
};

function formatExcluded(excluded: Record<string, number> | undefined): string {
  if (!excluded) return "";
  return Object.entries(excluded)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${formatNumber(n)} ${EXCLUDED_LABELS[key] || key}`)
    .join(" · ");
}

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

function labelFromStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "onboarding") return "Onboarding";
  if (s === "active") return "Active";
  if (s === "paused") return "Paused";
  return status;
}

export function PayFlowPortfolioDetailPage() {
  const { clientId, portfolioId } = useParams();
  const navigate = useNavigate();
  const { isOperationsAdmin, hasPermission } = usePayFlowAccess();
  const canEdit = isOperationsAdmin || hasPermission("edit_client");
  const canCreateWorkflow = hasPermission("create_edit_workflows");
  const cid = Number(clientId);
  const pid = Number(portfolioId);

  const [detail, setDetail] = useState<PayflowPortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [segmentPreview, setSegmentPreview] = useState<SegmentPreview | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Onboarding");
  const [description, setDescription] = useState("");
  const aiBusy = previewBusy || suggestBusy;

  async function load(opts?: { quiet?: boolean }) {
    if (!Number.isFinite(cid) || !Number.isFinite(pid)) return;
    if (!opts?.quiet) setLoading(true);
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
      if (!opts?.quiet) setDetail(null);
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [cid, pid]);

  async function previewSegments() {
    if (!Number.isFinite(cid) || !Number.isFinite(pid) || aiBusy) return;
    setPreviewBusy(true);
    setError("");
    setInfo("");
    try {
      const preview = await previewPayflowPortfolioSegments(cid, pid);
      setSegmentPreview(preview);
      const skipped = formatExcluded(preview.excluded);
      if (preview.segments.length) {
        setInfo(
          `Preview ready — ${preview.segments.length} segment(s) from ${formatNumber(preview.eligible_accounts)} eligible account(s). Nothing was saved.`,
        );
      } else if (skipped) {
        setInfo(
          `No segments — ${formatNumber(preview.eligible_accounts)} of ${formatNumber(preview.total_accounts)} eligible. Skipped: ${skipped}. AI only groups open accounts with a balance that are not resolved, on hold, or in human review.`,
        );
      } else {
        setInfo("No segments — not enough eligible accounts for AI grouping yet.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to preview segments");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function suggestWorkflows() {
    if (!Number.isFinite(cid) || !Number.isFinite(pid) || !canCreateWorkflow || aiBusy) return;
    setSuggestBusy(true);
    setError("");
    setInfo("PayFlow AI is designing workflows — this can take 1–5 minutes. Keep this page open.");
    try {
      const result = await suggestPayflowWorkflows({ client_id: cid, portfolio_id: pid });
      const count = result.workflows?.length ?? 0;
      setInfo(
        count
          ? `AI proposed ${count} workflow(s) as AI Proposed. Review them below or open a strategy.`
          : "Suggest finished but no workflows were returned.",
      );
      await load({ quiet: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "AI suggest failed. Nothing was saved — you can try again.",
      );
      setInfo("");
    } finally {
      setSuggestBusy(false);
    }
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!detail || !canEdit) return;
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
      setName(updated.name);
      setCode(updated.code);
      setStatus(labelFromStatus(updated.status));
      setDescription(updated.description || "");
      setInfo("Changes saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save portfolio");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!detail || !canEdit) return;
    setBusy(true);
    setError("");
    try {
      await deletePayflowClientPortfolio(cid, pid);
      navigate(`/payflow/clients/${cid}?tab=${encodeURIComponent("Sub-Clients / Portfolios")}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete portfolio");
      setBusy(false);
      setConfirmDelete(false);
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
            {SHOW_PAYFLOW_DELETE && canEdit ? (
              <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Btn>
            ) : null}
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
                disabled={!canEdit}
              />
            </Field>
            <Field label="Portfolio Code / Reference">
              <TextInput
                value={code}
                onChange={setCode}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={status}
                options={[...STATUS_OPTIONS]}
                onChange={setStatus}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Description">
              <TextInput
                value={description}
                onChange={setDescription}
                placeholder="Optional notes"
                disabled={!canEdit}
              />
            </Field>
            {canEdit ? (
              <div className="sm:col-span-2">
                <Btn variant="primary" disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save changes"}
                </Btn>
              </div>
            ) : null}
          </form>
        </Panel>

        <Panel
          title="Strategies / Workflows"
          description="Collection strategies scoped to this portfolio. Preview how AI would group accounts, or ask PayFlow AI to propose workflows."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/payflow/workflows?client=${encodeURIComponent(detail.client_name)}&portfolio=${encodeURIComponent(detail.name)}`}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                All strategies
              </Link>
              <Btn variant="secondary" disabled={aiBusy} onClick={() => void previewSegments()}>
                {previewBusy ? "Previewing…" : "Preview segments"}
              </Btn>
              {canCreateWorkflow ? (
                <>
                  <Btn variant="secondary" disabled={aiBusy} onClick={() => void suggestWorkflows()}>
                    {suggestBusy ? "Suggesting…" : "Suggest with AI"}
                  </Btn>
                  <Link
                    to={`/payflow/workflows/new?clientId=${detail.client_id}&portfolioId=${detail.id}`}
                  >
                    <Btn variant="primary" disabled={aiBusy}>
                      Create workflow
                    </Btn>
                  </Link>
                </>
              ) : null}
            </div>
          }
        >
          {suggestBusy ? (
            <p className="mb-3 text-[12.5px] text-muted-foreground">
              AI is working — typically 1–5 minutes on the free tier. Do not close this tab.
            </p>
          ) : null}

          {segmentPreview ? (
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-foreground">
                  Segment preview
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {formatNumber(segmentPreview.eligible_accounts)} eligible of{" "}
                    {formatNumber(segmentPreview.total_accounts)} accounts · not saved
                  </span>
                </p>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-primary hover:underline"
                  onClick={() => setSegmentPreview(null)}
                >
                  Hide
                </button>
              </div>
              {segmentPreview.segments.length === 0 ? (
                <div className="space-y-1 text-[12.5px] text-muted-foreground">
                  <p>No segments for this portfolio yet.</p>
                  {formatExcluded(segmentPreview.excluded) ? (
                    <p>
                      Skipped: {formatExcluded(segmentPreview.excluded)}. Open Cases and set
                      collection status to Active (with outstanding balance) to include them.
                    </p>
                  ) : null}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {segmentPreview.segments.map((seg) => {
                    const accounts =
                      typeof seg.stats?.accounts === "number" ? seg.stats.accounts : null;
                    const consentPct =
                      typeof seg.stats?.email_consent_pct === "number"
                        ? seg.stats.email_consent_pct
                        : null;
                    const allowedPct =
                      typeof seg.stats?.email_allowed_pct === "number"
                        ? seg.stats.email_allowed_pct
                        : null;
                    return (
                      <li
                        key={seg.segment_id}
                        className="rounded-md border border-border/70 px-3 py-2 text-[12.5px]"
                      >
                        <p className="font-medium text-foreground">{seg.label}</p>
                        {accounts != null ? (
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {formatNumber(accounts)} account{accounts === 1 ? "" : "s"}
                          </p>
                        ) : null}
                        {consentPct != null || allowedPct != null ? (
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {consentPct != null ? `Email consent ${consentPct}%` : null}
                            {consentPct != null && allowedPct != null ? " · " : null}
                            {allowedPct != null ? `Email allowed ${allowedPct}%` : null}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {(detail.strategies || []).length === 0 ? (
            <EmptyState
              title="No strategies for this portfolio"
              description={
                canCreateWorkflow
                  ? "Preview segments, suggest with AI, or create a workflow by hand."
                  : "Wait for an authorized user or PayFlow AI to propose a workflow."
              }
            />
          ) : (
            <ul className="space-y-2">
              {(detail.strategies || []).map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/payflow/workflows/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{s.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {s.origin || "—"} · v{s.version ?? 1}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        s.status === "Active"
                          ? "success"
                          : s.status === "AI Proposed" || s.status === "Under Review"
                            ? s.status === "AI Proposed"
                              ? "ai"
                              : "warning"
                            : s.status === "Approved"
                              ? "info"
                              : "neutral"
                      }
                      dot
                    >
                      {s.status}
                    </StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ConfirmDelete
        open={confirmDelete}
        title={`Delete ${detail.name}?`}
        description="This deletes the portfolio and its accounts, cases, reviews, communications, and workflows. The action is logged."
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}
