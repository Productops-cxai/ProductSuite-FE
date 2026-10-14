import { ImportFlow } from "../../components/payflow/import-flow";
import { PageHeader } from "../../components/payflow/lovable/payflow-ui";

export function PayFlowAccountImportPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Accounts / Cases", to: "/payflow/cases" }, { label: "Upload Daily CRM File" }]}
        title="Upload Daily CRM File"
        description="Provide the latest CRM account data. Existing accounts are refreshed and new accounts are created after you review the preview."
      />
      <ImportFlow kind="account" />
    </>
  );
}
