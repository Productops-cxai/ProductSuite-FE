import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import {
  downloadPayflowCommsExportHtml,
  exportPayflowComms,
  type PayflowCommListParams,
} from "../../api/payflow";
import { Modal } from "../ui/Modal";
import { Btn, StatusPill } from "./lovable/payflow-ui";
import type { PayflowCommExportReport } from "../../types";

function formatStamp(value?: string | null, empty = "Any") {
  if (!value) return empty;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Preview and print the retained email history for the filters already applied
 * on the communications list. The report itself comes from POST /payflow/comms/export.
 */
export function CommunicationExportDialog({
  open,
  onClose,
  filters,
  searchLabel,
}: {
  open: boolean;
  onClose: () => void;
  filters: PayflowCommListParams;
  searchLabel?: string;
}) {
  const [report, setReport] = useState<PayflowCommExportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const downloadLock = useRef(false);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setInfo("");
    setReport(null);
    exportPayflowComms(filters)
      .then((res) => {
        if (!cancelled) setReport(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to generate the export");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // filterKey is the stable snapshot of `filters` for this open preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterKey]);

  async function downloadPdf() {
    if (downloadLock.current || !report || report.total_emails === 0) return;
    downloadLock.current = true;
    setDownloading(true);
    setError("");
    setInfo("");
    const popup = window.open("", "_blank");
    try {
      const blob = await downloadPayflowCommsExportHtml(filters);
      const type = blob.type || "";
      if (type.includes("pdf")) {
        popup?.close();
        triggerDownload(blob, "email-communication-history.pdf");
        setInfo("PDF downloaded.");
        return;
      }
      const html = await blob.text();
      if (!html.trim()) {
        popup?.close();
        setError("The export file was empty.");
        return;
      }
      if (popup) {
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
        popup.focus();
        window.setTimeout(() => {
          try {
            popup.print();
          } catch {
            /* The report window stays open so the user can print from there. */
          }
        }, 300);
        setInfo("Print dialog opened. Choose Save as PDF to download the report.");
      } else {
        triggerDownload(
          new Blob([html], { type: "text/html" }),
          "email-communication-history.html",
        );
        setInfo(
          "Pop-up blocked. The report was downloaded as HTML. Open it and choose Print, then Save as PDF.",
        );
      }
    } catch (err) {
      popup?.close();
      setError(err instanceof ApiError ? err.detail : "Failed to download the report");
    } finally {
      downloadLock.current = false;
      setDownloading(false);
    }
  }

  const emails = report?.emails || [];
  const clientLabel = report?.client_name || "All Clients";
  const portfolioLabel = report?.portfolio_name || "All Sub-Clients / Portfolios";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      showClose
      title="Email Communication History"
      description="Retained emails that match the current filters. Older messages outside each client's retention period are excluded."
      bodyClassName="pr-1"
      footer={
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          <Btn variant="secondary" onClick={onClose} disabled={downloading}>
            Close
          </Btn>
          <Btn
            variant="primary"
            onClick={() => void downloadPdf()}
            disabled={loading || downloading || !report || report.total_emails === 0}
          >
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </Btn>
        </div>
      }
    >
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
      {loading ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">Generating exportable view…</p>
      ) : null}
      {!loading && report ? (
        <>
          <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-[12px]">
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Client: </span>
                {clientLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Sub-Clients / Portfolios: </span>
                {portfolioLabel}
              </div>
              {searchLabel ? (
                <div>
                  <span className="text-muted-foreground">Search: </span>
                  {searchLabel}
                </div>
              ) : null}
              {report.recipient_email ? (
                <div>
                  <span className="text-muted-foreground">Recipient: </span>
                  {report.recipient_email}
                </div>
              ) : null}
              <div>
                <span className="text-muted-foreground">Date range: </span>
                {formatStamp(report.date_from)} – {formatStamp(report.date_to)}
              </div>
              <div>
                <span className="text-muted-foreground">Total emails: </span>
                {report.total_emails}
              </div>
              <div>
                <span className="text-muted-foreground">Report generated on: </span>
                {formatStamp(report.generated_at, "—")}
              </div>
              {filters.channel ? (
                <div>
                  <span className="text-muted-foreground">Channel: </span>
                  {filters.channel}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  This export contains retained emails. SMS stays on the communications list.
                </div>
              )}
            </div>
          </div>
          {emails.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              No retained emails match the selected filters.
            </p>
          ) : (
            emails.map((email) => (
              <article key={email.id} className="border-t-2 border-foreground/70 py-4 first:border-t-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-foreground">
                    {email.subject || email.purpose || "(no subject)"}
                  </span>
                  {email.status ? <StatusPill>{email.status}</StatusPill> : null}
                </div>
                <div className="mb-2 grid gap-x-6 gap-y-0.5 text-[12px] sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Sent: </span>
                    {formatStamp(email.sent_at, "—")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">From: </span>
                    {email.from_email || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">To: </span>
                    {email.to_email || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account: </span>
                    {email.account_reference || "—"}
                    {email.customer_name ? ` · ${email.customer_name}` : ""}
                    {email.client_name ? ` · ${email.client_name}` : ""}
                  </div>
                </div>
                <div className="rounded-md bg-surface px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {email.body ||
                    (email.body_lines || []).filter(Boolean).join("\n") ||
                    "No retained message body."}
                </div>
              </article>
            ))
          )}
        </>
      ) : null}
    </Modal>
  );
}
