import { Link } from "react-router-dom";
import { ImportFlow } from "../../components/payflow/import-flow";
import { PageHeader } from "../../components/payflow/lovable/payflow-ui";

export function PayFlowClientImportPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Clients", to: "/payflow/clients" }, { label: "Import from File" }]}
        title="Import Clients"
        description="Upload a CRM file containing Clients and their Sub-Clients/Portfolios (Client → Sub-Client). New records are created and existing ones updated after you review the preview."
        actions={
          <Link to="/payflow/imports?type=client" className="text-[12.5px] font-semibold text-primary hover:underline">
            Import History
          </Link>
        }
      />
      <ImportFlow kind="client" />
    </>
  );
}
