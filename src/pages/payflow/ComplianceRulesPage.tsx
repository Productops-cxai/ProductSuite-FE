import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activateComplianceRule,
  deactivateComplianceRule,
  duplicateComplianceRule,
  getComplianceCatalog,
  listComplianceRules,
} from "../../api/compliance";
import { fetchStates } from "../../lib/geo-api";
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
import { useIsMobile } from "../../hooks/useIsMobile";
import { useClientPagedList } from "../../hooks/useOffsetPagination";
import type { ComplianceRule, ComplianceRulesListResponse } from "../../types";

const PAGE_SIZE = 10;
const ALL = "All";

function withAll(label: string, values: string[]) {
  return [{ value: ALL, label }, ...values.map((value) => ({ value, label: value }))];
}

function RuleStatusText({ status }: { status: string }) {
  const tone = complianceStatusTone(status);
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
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [summary, setSummary] = useState<ComplianceRulesListResponse["summary"]>({
    total: 0,
    active: 0,
    needs_review: 0,
    countries: 0,
  });
  const [canCreate, setCanCreate] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ rule: ComplianceRule; action: "activate" | "deactivate" } | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [channel, setChannel] = useState(ALL);
  const [classification, setClassification] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState("updated_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [states, setStates] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getComplianceCatalog()
      .then((catalog) => setCategories(catalog.categories.map((item) => item.name)))
      .catch(() => {
        /* category filter falls back to values present in the current result */
      });
  }, []);

  useEffect(() => {
    if (country === ALL || country === "") {
      setStates([]);
      return;
    }
    let cancelled = false;
    fetchStates(country)
      .then((rows) => {
        if (!cancelled) setStates(rows);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

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
      classification: classification === ALL ? "" : classification,
      status: status === ALL ? "" : status,
      sort,
      direction,
    })
      .then((res) => {
        if (cancelled) return;
        const rows = res.rules || [];
        setRules(rows);
        setSummary(res.summary);
        setCanCreate(res.can_create);
        setCanManage(res.can_manage_status);
        setCategories((current) =>
          current.length ? current : Array.from(new Set(rows.map((rule) => rule.category))).sort(),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setRules([]);
          setError(err instanceof ApiError ? err.detail : "Failed to load compliance rules.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, country, state, category, channel, classification, status, sort, direction]);

  const filterKey = `${debouncedSearch}|${country}|${state}|${category}|${channel}|${classification}|${status}|${sort}|${direction}`;
  const { pageItems, total, offset, pageSize, goPrev, goNext } = useClientPagedList(
    rules,
    PAGE_SIZE,
    filterKey,
  );
  const clientsKnown = rules.some((rule) => Array.isArray(rule.associated_clients));
  const derivedClients = clientsKnown
    ? new Set(rules.flatMap((rule) => (rule.associated_clients || []).map((client) => client.id))).size
    : null;
  const clientsAffected =
    typeof summary.clients_affected === "number" ? summary.clients_affected : derivedClients;

  async function runConfirmed() {
    if (!confirm) return;
    setBusyId(confirm.rule.id);
    setActionError("");
    try {
      const updated =
        confirm.action === "activate"
          ? await activateComplianceRule(confirm.rule.id)
          : await deactivateComplianceRule(confirm.rule.id);
      setRules((current) => current.map((rule) => (rule.id === updated.id ? updated : rule)));
      setConfirm(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : "The status change was not saved.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(rule: ComplianceRule) {
    setBusyId(rule.id);
    setActionError("");
    try {
      const copy = await duplicateComplianceRule(rule.id);
      navigate(`/payflow/compliance-rules/${copy.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : "The rule could not be duplicated.");
      setBusyId(null);
    }
  }

  const primaryAction = "text-[12.5px] font-medium text-primary hover:underline disabled:opacity-50";
  const mutedAction =
    "text-[12.5px] font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200";

  function renderActions(rule: ComplianceRule, includeView: boolean) {
    const canEdit = rule.can_edit && rule.status !== "Expired";
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
        {rule.can_edit ? (
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
        {canManage && (rule.status === "Inactive" || rule.status === "Scheduled") ? (
          <button type="button" className={mutedAction} onClick={() => setConfirm({ rule, action: "activate" })}>
            Activate
          </button>
        ) : null}
        {canManage && (rule.status === "Active" || rule.status === "Scheduled") ? (
          <button
            type="button"
            className={mutedAction}
            onClick={() => setConfirm({ rule, action: "deactivate" })}
          >
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
        <KpiCard variant="flat" label="Total compliance rules" value={String(summary.total)} />
        <KpiCard variant="flat" label="Active rules" value={String(summary.active)} />
        <KpiCard variant="flat" label="Countries / regions covered" value={String(summary.countries)} />
        <KpiCard variant="flat" label="Rules requiring review" value={String(summary.needs_review)} />
        <KpiCard
          variant="flat"
          label="Clients affected"
          value={clientsAffected == null ? "—" : String(clientsAffected)}
        />
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
            options={withAll("All Countries", ["United States", "Canada"])}
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
            options={withAll("All Channels", ["Call", "Email", "SMS", "Letter", "Other"])}
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
            value={classification}
            onChange={setClassification}
            options={withAll("All Types", ["Mandatory", "Conditional", "Client Policy"])}
          />
          <FilterSelect
            className="xl:!w-[220px]"
            label="Status"
            value={status}
            onChange={setStatus}
            options={withAll("All Statuses", [
              "Draft",
              "Pending Review",
              "Scheduled",
              "Active",
              "Inactive",
              "Expired",
            ])}
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
              { value: "effective_date", label: "Effective date" },
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
      {!loading && pageItems.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] [&_td]:py-3.5 [&_td]:text-[13px] [&_th]:bg-card [&_th]:py-3 [&_th]:text-[11px] [&_th]:tracking-[0.04em] [&_th]:text-[#94a3b8]">
          {isMobile ? (
            <div className="p-3">
              <MobileRecordCards>
                {pageItems.map((rule) => (
                  <MobileRecordCard
                    key={rule.id}
                    to={`/payflow/compliance-rules/${rule.id}`}
                    title={rule.name}
                    subtitle={`${rule.code} · ${rule.category}`}
                    badges={<RuleStatusText status={rule.status} />}
                    meta={
                      <p>
                        {rule.country} · {rule.states.length ? rule.states.join(", ") : "All"} · {rule.channel_label}
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
              {pageItems.map((rule) => {
                const place = [rule.regions.join(", "), rule.cities.join(", ")].filter(Boolean).join(" · ");
                const portal = rule.postal_codes.length ? rule.postal_codes.join(", ") : "Any";
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
                      {rule.scope_level ? (
                        <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
                          {rule.scope_level}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="max-w-[160px] whitespace-normal text-foreground">{rule.category}</Td>
                    <Td>{rule.country}</Td>
                    <Td>{rule.states.length ? rule.states.join(", ") : "All"}</Td>
                    <Td className="text-muted-foreground">{place || "—"}</Td>
                    <Td>{portal}</Td>
                    <Td>{rule.channel_label}</Td>
                    <Td>
                      <EnforcementPill value={rule.classification} />
                    </Td>
                    <Td>
                      <RuleStatusText status={rule.status} />
                    </Td>
                    <Td className="text-slate-600 dark:text-slate-300">{rule.effective_date || "—"}</Td>
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
              pageSize={pageSize}
              rowCount={pageItems.length}
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
            <Btn variant="primary" onClick={() => void runConfirmed()} disabled={busyId != null}>
              Confirm
            </Btn>
          </div>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          {confirm ? `${confirm.rule.code} · ${confirm.rule.name}` : ""}
        </p>
      </Modal>
    </>
  );
}
