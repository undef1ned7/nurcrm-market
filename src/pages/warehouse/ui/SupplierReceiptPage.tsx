import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { PageShell, PagePanel } from "@shared/ui/page-shell";
import { useSupplierReceipt } from "./supplierReceipt/hooks/useSupplierReceipt";
import { SupplierReceiptHeader } from "./supplierReceipt/components/SupplierReceiptHeader";
import { SupplierReceiptForm } from "./supplierReceipt/components/SupplierReceiptForm";
import { SupplierReceiptTable } from "./supplierReceipt/components/SupplierReceiptTable";
import { SupplierReceiptModals } from "./supplierReceipt/components/SupplierReceiptModals";
import "./Warehouse.scss";
import "./SupplierReceiptPage.scss";

export default function SupplierReceiptPage() {
  const vm = useSupplierReceipt();

  return (
    <PageShell className="warehouse-page market-receipt-page">
      <SupplierReceiptHeader vm={vm} />

      <DataContainer>
        <PagePanel className="market-receipt-page__card">
          <SupplierReceiptForm vm={vm} />
          <SupplierReceiptTable vm={vm} />
        </PagePanel>
      </DataContainer>

      <SupplierReceiptModals vm={vm} />
    </PageShell>
  );
}
