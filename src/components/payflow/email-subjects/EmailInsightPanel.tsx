import { useEffect, useState } from "react";
import { ApiError } from "../../../api/client";
import { generateEmailSubjectInsight } from "../../../api/emailSubjects";
import type { EmailInsightRequest, EmailInsightResponse } from "../../../types/emailSubjects";

function requestKey(request: EmailInsightRequest) {
  return JSON.stringify(request);
}

export function EmailInsightPanel({
  request,
  label = "Generate AI Insights",
}: {
  request: EmailInsightRequest;
  label?: string;
}) {
  const key = requestKey(request);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmailInsightResponse | null>(null);

  useEffect(() => {
    setResult(null);
    setError("");
  }, [key]);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await generateEmailSubjectInsight(request);
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.detail : "AI insights could not be generated.");
    } finally {
      setLoading(false);
    }
  }

  const severalClients = result?.evidence?.ai_context === "not_used_several_clients";
  const fromAi = result?.generated_by === "ai";

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"
      >
        {loading ? "Generating…" : label}
      </button>
      {error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {result ? (
        <div
          className={
            result.insufficient_data
              ? "mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              : "mt-2 rounded-md border border-violet-200 bg-violet-50/70 px-3 py-2.5 text-[12.5px] text-slate-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-slate-100"
          }
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            {result.insufficient_data
              ? "Insufficient data"
              : fromAi
                ? "AI recommendation"
                : "Explanation from measured numbers"}
          </p>
          <p className="mt-1 leading-relaxed">{result.insight || "The service returned an empty explanation."}</p>
          {result.observations.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {result.observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {fromAi
              ? "This is an AI explanation. It is separate from the measured counts above."
              : "This wording is fixed from the measured counts. It is not an AI recommendation."}
            {result.cached ? " Reused a recent explanation of the same numbers." : ""}
            {severalClients
              ? " Several clients are in this selection, so the AI was not given their combined history."
              : ""}
          </p>
          {result.disclaimer ? (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {result.disclaimer}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
