import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowEmailUnsubscribes } from "../../api/payflow";
import {
  Btn,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  Panel,
  SearchInput,
  StatusPill,
  Td,
  Tr,
} from "../../components/payflow/lovable/payflow-ui";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useOffsetPagination } from "../../hooks/useOffsetPagination";
import {
  formatUnsubscribeBalance,
  formatUnsubscribeStamp,
  unsubscribeSourceLabel,
} from "../../lib/emailUnsubscribe";
import type { PayflowClient, PayflowEmailUnsubscribeListItem } from "../../types";

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "This Month"];
const PAGE_SIZE = 10;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dateRangeToParams(date: string): { date_from?: string; date_to?: string } {
  if (date === "All Dates") return {};
  const now = new Date();
  if (date === "Today") {
    return { date_from: startOfDay(now).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  if (date === "Yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { date_from: startOfDay(y).toISOString(), date_to: endOfDay(y).toISOString() };
  }
  if (date === "Last 7 Days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { date_from: startOfDay(from).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  if (date === "This Month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date_from: startOfDay(from).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  return {};
}

function reasonText(row: PayflowEmailUnsubscribeListItem) {
  if (row.reason_labels?.length) return row.reason_labels.join("; ");
  if (row.reasons?.length) return row.reasons.join(", ");
  return "—";
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-slate-100 py-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-[12px] text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium break-words text-slate-900">{value}</dd>
    </div>
  );
}

function UnsubscribeDetailModal({
  row,
  onClose,
}: {
  row: PayflowEmailUnsubscribeListItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={row != null}
      title={row?.customer_name || "Unsubscribe"}
      description="Recorded when the customer confirmed unsubscribe. Suppression is immediate."
      onClose={onClose}
      showClose
      size="wide"
      titleExtra={
        row?.review_required ? <StatusPill tone="warning">Review required</StatusPill> : undefined
      }
      footer={
        <div className="mt-2 flex flex-wrap justify-end gap-2.5">
          <Btn onClick={onClose}>Close</Btn>
          {row ? (
            <Link
              to={`/payflow/cases/${row.account_id}`}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-brand hover:bg-primary/92"
            >
              Open case
            </Link>
          ) : null}
        </div>
      }
    >
      {row ? (
        <>
          {row.review_required ? (
            <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-slate-800">
              Flagged for operations review because of the reason selected. The unsubscribe is
              already in effect and is not waiting on this review.
            </p>
          ) : null}
          <dl>
            <DetailLine label="Customer" value={row.customer_name || "—"} />
            <DetailLine label="Client" value={row.client_name || "—"} />
            <DetailLine label="Account" value={row.account_reference || "—"} />
            <DetailLine label="Email" value={row.email_masked || "—"} />
            <DetailLine label="Balance" value={formatUnsubscribeBalance(row.outstanding_balance)} />
            <DetailLine label="Reasons" value={reasonText(row)} />
            <DetailLine label="Comments" value={row.comment?.trim() || "—"} />
            <DetailLine label="Source" value={unsubscribeSourceLabel(row.source)} />
            <DetailLine label="Unsubscribed" value={formatUnsubscribeStamp(row.unsubscribed_at)} />
            <DetailLine label="Review" value={row.review_required ? "Review required" : "Not flagged"} />
          </dl>
        </>
      ) : null}
    </Modal>
  );
}

export function PayFlowEmailUnsubscribesPage({ embedded = false }: { embedded?: boolean }) {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<PayflowEmailUnsubscribeListItem[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<PayflowEmailUnsubscribeListItem | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [date, setDate] = useState("All Dates");
  const [client, setClient] = useState("All Clients");
  const [review, setReview] = useState("all");
  const filterKey = [debouncedQuery, date, client, review].join("|");
  const { offset, pageSize, goPrev, goNext } = useOffsetPagination(PAGE_SIZE, filterKey);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    listPayflowClients({})
      .then((res) => {
        if (!cancelled) setClients(res.clients || []);
      })
      .catch(() => {
        /* filters still work without the client list */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClientId = useMemo(() => {
    if (client === "All Clients") return undefined;
    return clients.find((item) => item.name === client)?.id;
  }, [client, clients]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const range = dateRangeToParams(date);
    listPayflowEmailUnsubscribes({
      client_id: selectedClientId,
      search: debouncedQuery.trim() || undefined,
      date_from: range.date_from,
      date_to: range.date_to,
      review_required: review === "all" ? undefined : review === "true",
      limit: pageSize,
      offset,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.items || []);
        setTotal(res.total ?? (res.items || []).length);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.detail : "Failed to load email unsubscribes");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClientId, debouncedQuery, date, review, offset, pageSize]);

  return (
    <>
      {embedded ? null : (
        <PageHeader
          title="Unsubscribers"
          description="Customers who opted out of collection email. The unsubscribe link is sent only when the client applies Unsubscribe Option (Consent & Opt-Out), or when a mandatory compliance rule requires it. Review flags do not delay the opt-out."
        />
      )}

      <Panel
        title="Unsubscribers"
        description="Search by name, account, email, or client. Select a row for the recorded reason, comments, and review flag."
      >
        <FilterBar className="mb-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Name, account, email, or client"
            className="w-full md:col-span-2 xl:w-72"
          />
          <FilterSelect
            label="Client"
            value={client}
            onChange={setClient}
            options={["All Clients", ...clients.map((item) => item.name)]}
          />
          <FilterSelect
            label="Date"
            value={date}
            onChange={setDate}
            options={["All Dates", ...DATE_RANGES]}
          />
          <FilterSelect
            label="Review"
            value={review}
            onChange={setReview}
            options={[
              { value: "all", label: "All" },
              { value: "true", label: "Review required" },
              { value: "false", label: "Not flagged" },
            ]}
          />
        </FilterBar>

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading unsubscribes…</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="No unsubscribes match these filters"
            description="Accounts appear here after email consent is turned off and an unsubscribe event is recorded."
          />
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <>
            {isMobile ? (
              <MobileRecordCards>
                {rows.map((row) => (
                  <MobileRecordCard
                    key={row.event_id}
                    onClick={() => setSelected(row)}
                    title={row.customer_name || "—"}
                    subtitle={`${row.client_name || "—"} · ${row.account_reference || "—"}`}
                    badges={
                      row.review_required ? (
                        <StatusPill tone="warning">Review required</StatusPill>
                      ) : (
                        <StatusPill>Not flagged</StatusPill>
                      )
                    }
                    meta={
                      <div className="space-y-0.5">
                        <p>{reasonText(row)}</p>
                        <p>
                          {unsubscribeSourceLabel(row.source)} ·{" "}
                          {formatUnsubscribeStamp(row.unsubscribed_at)}
                        </p>
                        <p>{row.email_masked || "—"}</p>
                      </div>
                    }
                  />
                ))}
              </MobileRecordCards>
            ) : (
              <DataTable
                minWidth={1280}
                head={[
                  "Unsubscribed",
                  "Customer",
                  "Account",
                  "Client",
                  "Email",
                  "Balance",
                  "Reasons",
                  "Comment",
                  "Source",
                  "Review",
                ]}
              >
                {rows.map((row) => (
                  <Tr key={row.event_id} onClick={() => setSelected(row)}>
                    <Td className="whitespace-nowrap">
                      {formatUnsubscribeStamp(row.unsubscribed_at)}
                    </Td>
                    <Td className="font-medium text-primary">{row.customer_name || "—"}</Td>
                    <Td className="tabular">{row.account_reference || "—"}</Td>
                    <Td>{row.client_name || "—"}</Td>
                    <Td className="text-muted-foreground">{row.email_masked || "—"}</Td>
                    <Td className="tabular">{formatUnsubscribeBalance(row.outstanding_balance)}</Td>
                    <Td className="max-w-[240px] whitespace-normal">{reasonText(row)}</Td>
                    <Td className="max-w-[200px] whitespace-normal text-muted-foreground">
                      {row.comment?.trim() || "—"}
                    </Td>
                    <Td>{unsubscribeSourceLabel(row.source)}</Td>
                    <Td>
                      {row.review_required ? (
                        <StatusPill tone="warning">Review required</StatusPill>
                      ) : (
                        <StatusPill>Not flagged</StatusPill>
                      )}
                    </Td>
                  </Tr>
                ))}
              </DataTable>
            )}
            <Pagination
              total={total}
              offset={offset}
              pageSize={pageSize}
              rowCount={rows.length}
              onPrevious={goPrev}
              onNext={goNext}
              disabled={loading}
            />
          </>
        ) : null}
      </Panel>
      <UnsubscribeDetailModal row={selected} onClose={() => setSelected(null)} />
    </>
  );
}
