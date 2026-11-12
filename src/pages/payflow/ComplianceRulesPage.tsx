import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activateListedComplianceRule,
  deactivateListedComplianceRule,
  duplicateListedComplianceRule,
  getComplianceJurisdictions,
  getComplianceRuleCatalog,
  listComplianceRules,
} from "../../api/compliance";
import { complianceStatusTone } from "../../components/payflow/ComplianceRuleForm";
import {
  Btn,
  DataTable,
  FilterSelect,
  KpiCard,
  KpiGrid,
  SearchInput,
  StatusPill,
  Td,
  Tr,
} from "../../components/payflow/lovable/payflow-ui";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { ComplianceApiRule } from "../../types";

const PAGE_SIZE = 10;
const ALL = "All";

function withAll(label: string, values: string[]) {
  return [{ value: ALL, label }, ...values.map((value) => ({ value, label: value }))];
}

function ruleStatusTone(status: string) {
  if (status === "Pending Approval") return "warning" as const;
  return complianceStatusTone(status);
}

async function loadRuleSummary() {
  const first = await listComplianceRules({ limit: 200, offset: 0, sort: "country", order: "asc" });
  const rules = [...first.rules];
  let offset = first.rules.length;
  while (offset < first.total) {
    const next = await listComplianceRules({ limit: 200, offset, sort: "country", order: "asc" });
    rules.push(...next.rules);
    if (next.rules.length === 0) break;
    offset += next.rules.length;
  }
  return {
    total: first.total,
    active: rules.filter((rule) => rule.status === "Active").length,
    needs_review: rules.filter((rule) => rule.status === "Pending Approval").length,
    countries: new Set(rules.map((rule) => rule.country).filter(Boolean)).size,
  };
}

function RuleStatusText({ status }: { status: string }) {
  const tone = ruleStatusTone(status);
  const text = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-sky-600 dark:text-sky-400",
    danger: "text-red-600 dark:text-red-400",
    neutral: "text-slate-500 dark:text-slate-400",
  }[tone];
  const dot = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    danger: "bg-red-500",
    neutral: "bg-slate-400",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${text}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      {status}
    </span>
  );
}

function EnforcementPill({ value }: { value: string }) {
  const mandatory = value === "Mandatory";
  return (
    <span
      className={
        mandatory
          ? "inline-flex items-center rounded-full bg-[#e7f0ff] px-2.5 py-[3px] text-[12px] font-medium text-[#3b6cb8] dark:bg-primary/15 dark:text-primary"
          : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-[3px] text-[12px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }
    >
      {value}
    </span>
  );
}

export function PayFlowComplianceRulesPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { hasPermission, isOperationsAdmin } = usePayFlowAccess();
  const canCreate = hasPermission("modify_governance");
  const [rules, setRules] = useState<ComplianceApiRule[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{
    total: number;
    active: number;
    needs_review: number;
    countries: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<{
    rule: ComplianceApiRule;
    action: "activate" | "deactivate";
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [channel, setChannel] = useState(ALL);
  const [enforcement, setEnforcement] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState("updated_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [enforcements, setEnforcements] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getComplianceRuleCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setCategories(catalog.categories || []);
        setChannels(catalog.channels || []);
        setEnforcements(catalog.enforcements || []);
        setStatuses(catalog.statuses || []);
        setCountries((catalog.countries || []).map((item) => item.name).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setChannels([]);
          setEnforcements([]);
          setStatuses([]);
          setCountries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRuleSummary()
      .then((next) => {
        if (!cancelled) setSummary(next);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (country === ALL || country === "") {
      setStates([]);
      return;
    }
    let cancelled = false;
    getComplianceJurisdictions(country)
      .then((res) => {
        if (!cancelled) setStates((res.states || []).map((item) => item.name).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const filterKey = `${debouncedSearch}|${country}|${state}|${category}|${channel}|${enforcement}|${status}|${sort}|${direction}`;
  const [pageState, setPageState] = useState({ filterKey, offset: 0 });
  if (pageState.filterKey !== filterKey) {
    setPageState({ filterKey, offset: 0 });
  }
  const offset = pageState.filterKey === filterKey ? pageState.offset : 0;
  const goPrev = () => setPageState((current) => ({ ...current, offset: Math.max(0, current.offset - PAGE_SIZE) }));
  const goNext = () => setPageState((current) => ({ ...current, offset: current.offset + PAGE_SIZE }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listComplianceRules({
      search: debouncedSearch,
      country: country === ALL ? "" : country,
      state: state === ALL ? "" : state,
      category: category === ALL ? "" : category,
      channel: channel === ALL ? "" : channel,
      enforcement: enforcement === ALL ? "" : enforcement,
      status: status === ALL ? "" : status,
      sort,
      order: direction,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        if (cancelled) return;
        setRules(res.rules || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (!cancelled) {
          setRules([]);
          setTotal(0);
          setError(err instanceof ApiError ? err.detail : "Failed to load compliance rules.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    country,
    state,
    category,
    channel,
    enforcement,
    status,
    sort,
    direction,
    offset,
    reloadKey,
  ]);

  function canEditRule(rule: ComplianceApiRule) {
    if (!canCreate || rule.status === "Archived") return false;
    if (rule.status === "Active") return isOperationsAdmin;
    return true;
  }

  function openConfirm(rule: ComplianceApiRule, action: "activate" | "deactivate") {
    setReason("");
    setActionError("");
    setConfirm({ rule, action });
  }

  async function runConfirmed() {
    if (!confirm) return;
    if (confirm.action === "deactivate" && !reason.trim()) {
      setActionError("A reason is required to deactivate a rule.");
      return;
    }
    setBusyId(confirm.rule.id);
    setActionError("");
    try {
      if (confirm.action === "activate") {
        await activateListedComplianceRule(confirm.rule.id);
      } else {
        await deactivateListedComplianceRule(confirm.rule.id, reason.trim());
      }
      setConfirm(null);
      setReason("");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : "The status change was not saved.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(rule: ComplianceApiRule) {
    setBusyId(rule.id);
    setActionError("");
    try {
      const copy = await duplicateListedComplianceRule(rule.id);
      navigate(`/payflow/compliance-rules/${copy.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : "The rule could not be duplicated.");
      setBusyId(null);
    }
  }

  const primaryAction = "text-[12.5px] font-medium text-primary hover:underline disabled:opacity-50";
  const mutedAction =
    "text-[12.5px] font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200";

  function renderActions(rule: ComplianceApiRule, includeView: boolean) {
    const canEdit = canEditRule(rule);
    const canActivate = isOperationsAdmin && rule.status === "Inactive" && Boolean(rule.approved_at);
    const canDeactivate = isOperationsAdmin && rule.status === "Active";
    return (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {includeView ? (
          <Link to={`/payflow/compliance-rules/${rule.id}`} className={primaryAction}>
            View
          </Link>
        ) : null}
        {includeView && canEdit ? <span className="text-slate-300 select-none">|</span> : null}
        {canEdit ? (
          <Link to={`/payflow/compliance-rules/${rule.id}/edit`} className={primaryAction}>
            Edit
          </Link>
        ) : null}
        {canCreate ? (
          <button
            type="button"
            className={mutedAction}
            disabled={busyId === rule.id}
            onClick={() => void duplicate(rule)}
          >
            Duplicate
          </button>
        ) : null}
        <Link to={`/payflow/compliance-rules/${rule.id}?tab=audit`} className={mutedAction}>
          History
        </Link>
        {canActivate ? (
          <button type="button" className={mutedAction} onClick={() => openConfirm(rule, "activate")}>
            Activate
          </button>
        ) : null}
        {canDeactivate ? (
          <button type="button" className={mutedAction} onClick={() => openConfirm(rule, "deactivate")}>
            Deactivate
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-tight font-semibold tracking-tight text-foreground sm:text-[24px]">
            Compliance Rules
          </h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Jurisdictional protections, separate from System and Client operational rules.
          </p>
        </div>
        {canCreate ? (
          <Link to="/payflow/compliance-rules/new" className="inline-flex shrink-0">
            <Btn variant="primary" className="!rounded-lg px-4">
              + Add Compliance Rule
            </Btn>
          </Link>
        ) : (
          <StatusPill>Read-only access</StatusPill>
        )}
      </div>

      <p className="mb-5 rounded-lg border border-[#f0e4c4] bg-[#fbf7ee] px-4 py-2.5 text-[13px] leading-snug font-medium text-[#9a7340] dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200/90">
        Sample configurations only. All example regulations, limits and calendars require legal validation
        before operational use.
      </p>

      <KpiGrid
        columns={5}
        className="mb-5 !gap-3 max-sm:[&>*:last-child]:col-span-2"
      >
        <KpiCard variant="flat" label="Total compliance rules" value={summary ? String(summary.total) : "—"} />
        <KpiCard variant="flat" label="Active rules" value={summary ? String(summary.active) : "—"} />
        <KpiCard variant="flat" label="Countries / regions covered" value={summary ? String(summary.countries) : "—"} />
        <KpiCard variant="flat" label="Rules requiring review" value={summary ? String(summary.needs_review) : "—"} />
        <KpiCard variant="flat" label="Clients affected" value="—" />
      </KpiGrid>

      <div className="mb-4 space-y-2.5">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(200px,1.3fr)_repeat(4,minmax(150px,1fr))]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search compliance rule"
            className="w-full md:col-span-2 xl:col-span-1"
          />
          <FilterSelect
            className="xl:!w-full"
            label="Country"
            value={country}
            onChange={(value) => {
              setCountry(value);
              setState(ALL);
            }}
            options={withAll("All Countries", countries)}
          />
          <FilterSelect
            className="xl:!w-full"
            label="Region"
            value={state}
            onChange={setState}
            options={withAll("All Regions", states)}
          />
          <FilterSelect
            className="xl:!w-full"
            label="Channel"
            value={channel}
            onChange={setChannel}
            options={[
              { value: ALL, label: "All Channels" },
              ...channels.map((value) => ({
                value,
                label: value === "All Channels" ? "All Channels (exact)" : value,
              })),
            ]}
          />
          <FilterSelect
            className="xl:!w-full"
            label="Category"
            value={category}
            onChange={setCategory}
            options={withAll("All Categories", categories)}
          />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <FilterSelect
            className="xl:!w-[220px]"
            label="Enforcement"
            value={enforcement}
            onChange={setEnforcement}
            options={withAll("All Types", enforcements)}
          />
          <FilterSelect
            className="xl:!w-[220px]"
            label="Status"
            value={status}
            onChange={setStatus}
            options={withAll("All Statuses", statuses)}
          />
          <FilterSelect
            className="xl:!w-[200px]"
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: "updated_at", label: "Last updated" },
              { value: "name", label: "Rule name" },
              { value: "code", label: "Rule ID" },
              { value: "effective_from", label: "Effective date" },
              { value: "status", label: "Status" },
              { value: "country", label: "Country" },
            ]}
          />
          <FilterSelect
            className="xl:!w-[180px]"
            label="Direction"
            value={direction}
            onChange={(value) => setDirection(value === "asc" ? "asc" : "desc")}
            options={[
              { value: "desc", label: "Descending" },
              { value: "asc", label: "Ascending" },
            ]}
          />
        </div>
      </div>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {actionError ? <p className="mb-3 text-sm text-destructive">{actionError}</p> : null}
      {loading ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          Loading compliance rules…
        </div>
      ) : null}
      {!loading && !error && rules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          No compliance rules match these filters.
        </div>
      ) : null}
      {!loading && rules.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] [&_td]:py-3.5 [&_td]:text-[13px] [&_th]:bg-card [&_th]:py-3 [&_th]:text-[11px] [&_th]:tracking-[0.04em] [&_th]:text-[#94a3b8]">
          {isMobile ? (
            <div className="p-3">
              <MobileRecordCards>
                {rules.map((rule) => (
                  <MobileRecordCard
                    key={rule.id}
                    to={`/payflow/compliance-rules/${rule.id}`}
                    title={rule.name}
                    subtitle={`${rule.code} · ${rule.category}`}
                    badges={<RuleStatusText status={rule.status} />}
                    meta={
                      <p>
                        {rule.country || "—"} · {rule.state || "All"} · {rule.channel || "—"}
                      </p>
                    }
                    footer={renderActions(rule, false)}
                  />
                ))}
              </MobileRecordCards>
            </div>
          ) : (
            <DataTable
              embedded
              minWidth={1480}
              className="max-h-[70vh] rounded-none border-0 shadow-none"
              head={[
                "Rule ID",
                "Rule name",
                "Category",
                "Country",
                "Region / state",
                "Region / city",
                "Portal code",
                "Channel",
                "Enforcement",
                "Status",
                "Effective date",
                "Actions",
              ]}
            >
              {rules.map((rule) => {
                const place = [rule.region, rule.city].filter(Boolean).join(" · ");
                const portal = rule.postal || "Any";
                return (
                  <Tr key={rule.id}>
                    <Td className="text-[12.5px] font-medium text-slate-500">{rule.code}</Td>
                    <Td className="max-w-[260px] whitespace-normal">
                      <Link
                        to={`/payflow/compliance-rules/${rule.id}`}
                        className="text-[13px] font-medium text-primary hover:underline"
                      >
                        {rule.name}
                      </Link>
                      {rule.jurisdiction_type ? (
                        <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
                          {rule.jurisdiction_type}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="max-w-[160px] whitespace-normal text-foreground">{rule.category}</Td>
                    <Td>{rule.country || "—"}</Td>
                    <Td>{rule.state || "All"}</Td>
                    <Td className="text-muted-foreground">{place || "—"}</Td>
                    <Td>{portal}</Td>
                    <Td>{rule.channel || "—"}</Td>
                    <Td>
                      <EnforcementPill value={rule.enforcement} />
                    </Td>
                    <Td>
                      <RuleStatusText status={rule.status} />
                    </Td>
                    <Td className="text-slate-600 dark:text-slate-300">{rule.effective_from || "—"}</Td>
                    <Td>{renderActions(rule, true)}</Td>
                  </Tr>
                );
              })}
            </DataTable>
          )}
          <div className="px-4 pb-3">
            <Pagination
              total={total}
              offset={offset}
              pageSize={PAGE_SIZE}
              rowCount={rules.length}
              onPrevious={goPrev}
              onNext={goNext}
              disabled={loading}
              className="mt-0 border-border/80"
            />
          </div>
        </div>
      ) : null}

      <Modal
        title={confirm?.action === "deactivate" ? "Deactivate rule?" : "Activate rule?"}
        description="This changes whether the rule applies to collection activity."
        open={confirm != null}
        onClose={() => setConfirm(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setConfirm(null)}>Cancel</Btn>
            <Btn
              variant="primary"
              onClick={() => void runConfirmed()}
              disabled={busyId != null || (confirm?.action === "deactivate" && !reason.trim())}
            >
              Confirm
            </Btn>
          </div>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          {confirm ? `${confirm.rule.code} · ${confirm.rule.name}` : ""}
        </p>
        {confirm?.action === "deactivate" ? (
          <label className="mt-3 block text-[13px]">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
          </label>
        ) : null}
      </Modal>
    </>
  );
}
