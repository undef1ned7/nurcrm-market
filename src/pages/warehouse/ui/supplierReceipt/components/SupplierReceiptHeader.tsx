import { ArrowLeft } from "lucide-react";
import { PageHeader, StatusChip } from "@shared/ui/page-shell";
import type { SupplierReceiptVm } from "../hooks/useSupplierReceipt";

type Props = {
  vm: SupplierReceiptVm;
};

export function SupplierReceiptHeader({ vm }: Props) {
  const { navigate, selectedSupplierId } = vm;

  return (
    <>
      <PageHeader
        title="Закупки"
        subtitle="Выберите поставщика и оприходуйте его товары на склад"
        actions={
          <button
            className="nur-btn nur-btn--secondary"
            onClick={() => navigate("/crm/market/procurement")}
            type="button"
          >
            <ArrowLeft size={16} />
            Назад к закупкам
          </button>
        }
      />

      <div className="market-receipt-page__steps" aria-label="Этапы приёмки">
        <StatusChip tone={selectedSupplierId ? "success" : "primary"}>
          1. Поставщик
        </StatusChip>
        <StatusChip tone={selectedSupplierId ? "primary" : "default"}>
          2. Товары
        </StatusChip>
        <StatusChip>3. Итог</StatusChip>
      </div>
    </>
  );
}
