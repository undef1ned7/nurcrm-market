import {
  ArrowLeft,
  Plus,
  FileSpreadsheet,
  Pencil,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ClientDetailsHeaderProps {
  clientName: string;
  clientInitials: string;
  statusText: string;
  clientTypeLabel: string;
  sectorName?: string;
  clientErr?: string | null;
  onBack: () => void;
  onAddDeal: () => void;
  onReconciliation: () => void;
  onEditClient: () => void;
}

export function ClientDetailsHeader({
  clientName,
  clientInitials,
  statusText,
  clientTypeLabel,
  clientErr,
  onBack,
  onAddDeal,
  onReconciliation,
  onEditClient,
}: ClientDetailsHeaderProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="cdx__topbar">
        <div className="cdx__topbar-left">
          <button
            type="button"
            onClick={onBack}
            className="cdx__btn cdx__btn--ghost"
          >
            <ArrowLeft /> {t("crm.clients.details.back")}
          </button>

          <div className="cdx__identity">
            <div className="cdx__avatar" aria-hidden="true">
              {clientInitials}
            </div>
            <div className="cdx__identity-text">
              <h1 className="cdx__name" title={clientName}>
                {clientName}
              </h1>
              <div className="cdx__identity-meta">
                <span className="cdx__badge cdx__badge--status">
                  {statusText}
                </span>
                <span className="cdx__identity-type">{clientTypeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cdx__topbar-actions">
          <button
            type="button"
            className="cdx__btn cdx__btn--primary"
            onClick={onAddDeal}
          >
            <Plus /> {t("crm.clients.details.addDeal")}
          </button>
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onReconciliation}
          >
            <FileSpreadsheet /> {t("crm.clients.details.reconciliation")}
          </button>
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onEditClient}
          >
            <Pencil /> {t("crm.clients.details.editClientLong")}
          </button>
        </div>
      </div>

      {clientErr && <div className="cdx__alert">{clientErr}</div>}
    </>
  );
}
