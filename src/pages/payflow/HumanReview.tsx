import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Panel } from "../../components/payflow/lovable/payflow-ui";

/**
 * Case-level Human Review queue (distinct from Human Review nodes inside a strategy).
 * Strategy / workflow review & approval lives on Strategies / Workflows.
 */
export function PayFlowHumanReview() {
  return (
    <>
      <PageHeader
        title="Human Review"
        description="Case-level review queue for flagged accounts. Strategy approval is handled under Strategies / Workflows."
      />
      <Panel title="Review queue">
        <EmptyState
          title="Case review queue coming next"
          description="Use Strategies / Workflows to begin review, modify, approve and activate AI-proposed or draft collection strategies."
          action={
            <Link
              to="/payflow/workflows?status=Under%20Review"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              Open strategies awaiting review
            </Link>
          }
        />
      </Panel>
    </>
  );
}
