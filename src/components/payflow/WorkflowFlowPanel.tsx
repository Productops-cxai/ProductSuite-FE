import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPayflowWorkflows } from "../../api/payflow";
import {
  ensureStepLinks,
  strategyStatusTone,
} from "../../lib/strategy-workflow";
import type { PayflowStrategy } from "../../types";
import { StrategyCanvas } from "./strategy-canvas";
import { Btn, Panel, StatusPill } from "./lovable/payflow-ui";

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function resolveWorkflowByName(
  strategies: PayflowStrategy[],
  workflowName?: string | null,
): PayflowStrategy | undefined {
  if (!strategies.length) return undefined;
  if (!workflowName) return strategies[0];
  const wanted = tokens(workflowName);
  let best = strategies[0];
  let bestScore = -1;
  for (const s of strategies) {
    const have = tokens(`${s.name} ${s.summary || ""}`);
    const score = wanted.filter((t) => have.includes(t)).length;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Read-only embedded workflow canvas for case / review surfaces.
 * Editing happens in the Strategy Builder.
 */
export function WorkflowFlowPanel({
  clientId,
  workflowName,
  title = "Collection Workflow",
  description = "Same visual map used in the Strategy Builder. Open the builder to review or modify steps.",
  className,
}: {
  clientId?: number | null;
  workflowName?: string | null;
  title?: string;
  description?: string;
  className?: string;
}) {
  const [strategies, setStrategies] = useState<PayflowStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowWorkflows(clientId ? { client_id: clientId } : {})
      .then((res) => {
        if (cancelled) return;
        setStrategies((res.strategies || []).map(ensureStepLinks));
      })
      .catch(() => {
        if (!cancelled) setStrategies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const strategy = useMemo(
    () => resolveWorkflowByName(strategies, workflowName),
    [strategies, workflowName],
  );

  if (loading) {
    return (
      <Panel title={title} description={description} className={className}>
        <p className="text-[13px] text-muted-foreground">Loading workflow…</p>
      </Panel>
    );
  }

  if (!strategy) {
    return (
      <Panel
        title={title}
        description={workflowName || "No workflow assigned"}
        className={className}
        action={
          <Link to="/payflow/workflows">
            <Btn>Open strategies</Btn>
          </Link>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          {workflowName
            ? `No matching strategy found for “${workflowName}”.`
            : "No collection strategy is currently assigned."}
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      description={description}
      className={className}
      bodyClassName="p-3"
      action={
        <Link to={`/payflow/workflows/${strategy.id}`}>
          <Btn>Open in Strategy Builder</Btn>
        </Link>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <span className="text-[13px] font-semibold text-foreground">{strategy.name}</span>
        <StatusPill tone={strategyStatusTone(strategy.status)} dot>
          {strategy.status}
        </StatusPill>
        <StatusPill>v{strategy.version}</StatusPill>
        {strategy.portfolio_name && <StatusPill>{strategy.portfolio_name}</StatusPill>}
      </div>

      <StrategyCanvas
        strategy={strategy}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </Panel>
  );
}
