import {
  ArrowLeft,
  Plus,
  FileSpreadsheet,
  Pencil,
} from "lucide-react";

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
  return (
    <>
      <div className="cdx__topbar">
        <div className="cdx__topbar-left">
          <button
            type="button"
            onClick={onBack}
            className="cdx__btn cdx__btn--ghost"
          >
            <ArrowLeft /> Назад
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
            <Plus /> Добавить сделку
          </button>
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onReconciliation}
          >
            <FileSpreadsheet /> Акт сверки
          </button>
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onEditClient}
          >
            <Pencil /> Редактировать клиента
          </button>
        </div>
      </div>

      {clientErr && <div className="cdx__alert">{clientErr}</div>}
    </>
  );
}
