import { StatusPill } from "./lovable/payflow-ui";
import { cn } from "../../lib/utils";
import {
  conditionLabel,
  ensureStepLinks,
  entryNodeId,
  stepConfig,
  stepTone,
  stepsById,
  timingLabel,
} from "../../lib/strategy-workflow";
import type { PayflowStrategy, PayflowStrategyStep } from "../../types";

function NodeIcon({ kind, channel }: { kind: string; channel?: string | null }) {
  const cls = "size-4";
  if (kind === "Communication" && channel === "SMS") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (kind === "Communication") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 7 9-7" />
      </svg>
    );
  }
  if (kind === "Wait") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (kind === "Condition") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 3v12a4 4 0 0 0 4 4h8" />
        <path d="M6 8h6M14 19l4-4-4-4" />
      </svg>
    );
  }
  if (kind === "Human Review") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
        <path d="m9.5 12.5 1.5 1.5 3-3" />
      </svg>
    );
  }
  if (kind === "AI Reassessment") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (kind === "Outcome") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <path d="M4 22v-7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function accent(kind: string) {
  switch (kind) {
    case "Condition":
      return "bg-warning/15 text-warning-foreground";
    case "AI Reassessment":
      return "bg-ai/10 text-ai";
    case "Outcome":
      return "bg-success/10 text-success";
    case "Human Review":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-primary/10 text-primary";
  }
}

function topBar(kind: string) {
  switch (kind) {
    case "Condition":
      return "bg-warning";
    case "Outcome":
      return "bg-success";
    case "AI Reassessment":
      return "bg-ai";
    case "Human Review":
      return "bg-destructive";
    default:
      return "bg-primary";
  }
}

function Arrow() {
  return (
    <span
      className="absolute -bottom-[1px] left-1/2 size-0 -translate-x-1/2 border-x-[4px] border-t-[6px] border-x-transparent border-t-border-strong"
      aria-hidden
    />
  );
}

function Connector({ label, tone }: { label?: string; tone?: "success" | "danger" }) {
  return (
    <div className="relative h-11 w-px bg-border-strong" aria-hidden>
      {label && (
        <span
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-[1px] text-[10px] font-bold tracking-wide whitespace-nowrap shadow-subtle",
            tone === "success"
              ? "border-success/40 bg-success/10 text-success"
              : tone === "danger"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-card text-muted-foreground",
          )}
        >
          {label}
        </span>
      )}
      <Arrow />
    </div>
  );
}

function NodeCard({
  node,
  selected,
  onSelect,
}: {
  node: PayflowStrategyStep;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg = stepConfig(node);
  const timing = timingLabel(node);
  const condition = conditionLabel(node);
  const channel = cfg.channel || node.channel;
  const purpose = cfg.purpose || node.purpose;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative w-[248px] cursor-pointer rounded-xl border bg-card px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel",
        selected
          ? "border-primary ring-2 ring-primary/25 shadow-panel"
          : "border-border shadow-subtle hover:border-primary/40",
        node.disabled && "opacity-55",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-[3px] rounded-t-xl", topBar(node.kind))} aria-hidden />
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", accent(node.kind))}>
          <NodeIcon kind={node.kind} channel={channel} />
        </span>
        <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
          {node.kind}
        </span>
        {node.origin === "Human Modified" && (
          <span className="ml-auto rounded-full bg-info/10 px-1.5 py-[1px] text-[9.5px] font-bold text-info">
            Human
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-snug font-semibold text-foreground">{node.title}</p>
      {condition && <p className="mt-1 text-[11.5px] text-muted-foreground">{condition}</p>}
      {timing && <p className="mt-1 text-[11.5px] text-muted-foreground">{timing}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {channel && <StatusPill tone={stepTone(node.kind)}>{channel}</StatusPill>}
        {purpose && <StatusPill>{purpose}</StatusPill>}
        {cfg.action && <StatusPill>{cfg.action}</StatusPill>}
        {cfg.outcome && <StatusPill tone="success">{cfg.outcome}</StatusPill>}
        {node.disabled && <StatusPill tone="neutral">Disabled</StatusPill>}
      </div>
    </div>
  );
}

function NodeBranch({
  nodes,
  nodeId,
  selectedId,
  onSelect,
  depth = 0,
}: {
  nodes: Record<string, PayflowStrategyStep>;
  nodeId: string | null | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  if (!nodeId || depth > 24) return null;
  const node = nodes[nodeId];
  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        selected={selectedId === node.id}
        onSelect={() => onSelect(node.id!)}
      />
      {node.kind === "Condition" ? (
        (() => {
          const paths = (["yes", "no"] as const).filter((p) => node[p]);
          if (!paths.length) return null;
          return (
            <>
              <span className="h-6 w-px bg-border-strong" aria-hidden />
              <div className="flex items-start">
                {paths.map((path, i) => (
                  <div key={path} className="flex flex-col items-center px-4 sm:px-7">
                    <div className="flex w-full" aria-hidden>
                      <span className={cn("h-px flex-1", i === 0 ? "bg-transparent" : "bg-border-strong")} />
                      <span
                        className={cn(
                          "h-px flex-1",
                          i === paths.length - 1 ? "bg-transparent" : "bg-border-strong",
                        )}
                      />
                    </div>
                    <Connector
                      label={path === "yes" ? "YES" : "NO"}
                      tone={path === "yes" ? "success" : "danger"}
                    />
                    <NodeBranch
                      nodes={nodes}
                      nodeId={node[path]}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      depth={depth + 1}
                    />
                  </div>
                ))}
              </div>
            </>
          );
        })()
      ) : node.next ? (
        <>
          <Connector />
          <NodeBranch
            nodes={nodes}
            nodeId={node.next}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </>
      ) : null}
    </div>
  );
}

export function StrategyCanvas({
  strategy,
  selectedId,
  onSelect,
}: {
  strategy: PayflowStrategy;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const linked = ensureStepLinks(strategy);
  const nodes = stepsById(linked);
  const entry = entryNodeId(linked);

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border/70 bg-surface px-6 py-8"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklab, var(--color-border-strong) 60%, transparent) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <div className="flex min-w-max justify-center">
        <NodeBranch nodes={nodes} nodeId={entry} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  );
}

/** Compact non-interactive preview used on strategy library cards. */
export function StrategyMiniMap({ strategy }: { strategy: PayflowStrategy }) {
  const linked = ensureStepLinks(strategy);
  const nodes = stepsById(linked);
  const rows: { kinds: string[] }[] = [];
  let current: string | null | undefined = entryNodeId(linked);
  let guard = 0;
  while (current && guard < 6) {
    const node = nodes[current];
    if (!node) break;
    if (node.kind === "Condition") {
      rows.push({ kinds: ["Condition"] });
      const yes = node.yes ? nodes[node.yes] : undefined;
      const no = node.no ? nodes[node.no] : undefined;
      const pair: string[] = [];
      if (yes) pair.push(yes.kind);
      if (no) pair.push(no.kind);
      if (pair.length) rows.push({ kinds: pair });
      current = node.no ?? null;
    } else {
      rows.push({ kinds: [node.kind] });
      current = node.next ?? null;
    }
    guard += 1;
  }

  const barColor = (kind: string) =>
    kind === "Condition"
      ? "bg-warning/60"
      : kind === "Outcome"
        ? "bg-success/60"
        : kind === "AI Reassessment"
          ? "bg-ai/60"
          : "bg-primary/45";

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-3 py-3"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklab, var(--color-border-strong) 50%, transparent) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      }}
      aria-hidden
    >
      {rows.slice(0, 5).map((row, i) => (
        <div key={i} className="flex w-full items-center justify-center gap-2">
          {row.kinds.map((kind, j) => (
            <span
              key={j}
              className="flex h-4 flex-1 items-center gap-1 rounded-[4px] border border-border/70 bg-card px-1"
              style={{ maxWidth: row.kinds.length > 1 ? 60 : 96 }}
            >
              <span className={cn("size-1.5 rounded-full", barColor(kind))} />
              <span className="h-1 flex-1 rounded-full bg-border-strong/60" />
            </span>
          ))}
        </div>
      ))}
      {rows.length === 0 && (
        <span className="text-[10px] text-muted-foreground">No steps</span>
      )}
    </div>
  );
}
