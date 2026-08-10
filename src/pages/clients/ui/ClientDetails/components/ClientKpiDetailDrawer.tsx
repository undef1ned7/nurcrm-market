import type { ReactNode } from "react";
import { X } from "lucide-react";

import type { DetailRow } from "../clientDetails.types";
import ClientModalPortal from "./ClientModalPortal";

export interface ClientKpiDetailsMeta {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: string;
  total: number;
}

export interface ClientKpiDetailDrawerProps {
  open: boolean;
  mode?: string;
  detailsMeta: ClientKpiDetailsMeta;
  detailRows: DetailRow[];
  onClose: () => void;
}

export function ClientKpiDetailDrawer({
  open,
  mode,
  detailsMeta,
  detailRows,
  onClose,
}: ClientKpiDetailDrawerProps) {
  if (!open) return null;

  return (
    <ClientModalPortal wrapperId="client-details-kpi-modal">
      <div
        className="cmx__overlay"
        data-theme={mode}
        onClick={onClose}
      >
        <div
          className="cmx__dialog cmx__dialog--sm cmx__dialog--kpi"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-kpi-modal-title"
        >
          <div className="cmx__header">
            <div className="cmx__heading">
              <span className="cmx__heading-icon">{detailsMeta.icon}</span>
              <div className="cmx__heading-text">
                <h3 className="cmx__title" id="client-kpi-modal-title">
                  {detailsMeta.title}
                </h3>
                <p className="cmx__subtitle">{detailsMeta.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              className="cmx__close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X />
            </button>
          </div>

          <div className="cmx__body">
            <div
              className={[
                "cmx__kpi-total",
                detailsMeta.tone === "danger" && "cmx__kpi-total--danger",
                detailsMeta.tone === "success" && "cmx__kpi-total--success",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="cmx__kpi-total-label">Итого</span>
              <span className="cmx__kpi-total-value">
                {detailsMeta.total.toFixed(2)}
                <span>сом</span>
              </span>
            </div>

            <div className="cmx__section-title">Операции</div>

            {detailRows.length === 0 ? (
              <div className="cmx__kpi-empty">
                Нет данных по выбранной категории
              </div>
            ) : (
              <ul className="cmx__kpi-list">
                {detailRows.map((row) => (
                  <li key={row.id} className="cmx__kpi-row">
                    <span className="cmx__kpi-avatar" aria-hidden="true">
                      {String(row.title || "?")
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </span>
                    <div className="cmx__kpi-row-main">
                      <span className="cmx__kpi-row-title">{row.title}</span>
                      <span className="cmx__kpi-row-date">{row.date}</span>
                    </div>
                    <span className="cmx__kpi-row-amount">
                      {row.amount.toFixed(2)}
                      <span>сом</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cmx__footer">
            <div className="cmx__footer-left" />
            <div className="cmx__footer-right">
              <button
                type="button"
                className="cmx__btn cmx__btn--ghost"
                onClick={onClose}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </ClientModalPortal>
  );
}
