import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, X, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { msgFromError } from "../clientDetails.helpers";
import api from "@shared/api";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import ReconciliationPdfDocument from "@pages/documents/ui/components/ReconciliationPdfDocument";
import { buildReconciliation } from "@pages/documents/ui/components/reconciliationRows";
import ClientModalPortal from "./ClientModalPortal";
import "../ClientModals.scss";

export default function ReconciliationModal({
  open,
  clientId,
  clientName,
  onClose,
}: any) {
  const { mode } = useContext(ThemeModeContext);
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  if (!open || !clientId) return null;

  const downloadBlob = (blob, suggestedName = "reconciliation.pdf") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fetchReconciliation = async () => {
    setLoading(true);
    setErr("");
    setNote("");

    try {
      const params: Record<string, string> = { currency: "KGS" };
      if (filters.start) params.start = filters.start;
      if (filters.end) params.end = filters.end;

      const res = await api.get(
        `/main/clients/${clientId}/reconciliation/json/`,
        { params, headers: { Accept: "application/json" } },
      );
      const data = res?.data;
      const { excludedDuplicates } = buildReconciliation(data);
      if (excludedDuplicates > 0) {
        setNote(
          t("crm.clients.details.reconDuplicatesExcluded", {
            count: excludedDuplicates,
          }),
        );
      }
      const blob = await pdf(
        <ReconciliationPdfDocument
          data={data}
          meta={{
            start: filters.start,
            end: filters.end,
            currency: params.currency,
            clientName: clientName || data?.client?.name,
            companyName: data?.company?.name,
          }}
        />,
      ).toBlob();

      downloadBlob(
        blob,
        `reconciliation_${clientId}_${filters.start || ""}_${filters.end || ""}.pdf`,
      );
    } catch (e) {
      console.error(e);
      setErr(
        msgFromError(e, t("crm.clients.details.reconciliationLoadError")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientModalPortal wrapperId="client-reconciliation-modal" onEscape={onClose}>
      <div className="cmx__overlay" data-theme={mode} onClick={onClose}>
        <div
          className="cmx__dialog cmx__dialog--sm"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="cmx__header">
            <div className="cmx__heading">
              <span className="cmx__heading-icon">
                <FileSpreadsheet />
              </span>
              <div className="cmx__heading-text">
                <h3 className="cmx__title">
                  {t("crm.clients.details.reconTitle")}
                </h3>
                <p className="cmx__subtitle">
                  {t("crm.clients.details.reconSubtitle")}
                </p>
              </div>
            </div>
            <button
              className="cmx__close"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X />
            </button>
          </div>

          <div className="cmx__body">
            <div className="cmx__grid">
              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.dateFromShort")}
                </span>
                <input
                  className="cmx__input"
                  type="date"
                  value={filters.start}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, start: e.target.value }))
                  }
                />
              </label>
              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.dateToShort")}
                </span>
                <input
                  className="cmx__input"
                  type="date"
                  value={filters.end}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, end: e.target.value }))
                  }
                />
              </label>
            </div>

            {err && <div className="cmx__alert">{err}</div>}
            {note && <div className="cmx__alert">{note}</div>}
          </div>

          <div className="cmx__footer">
            <div className="cmx__footer-left">
              <button className="cmx__btn cmx__btn--ghost" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
            <div className="cmx__footer-right">
              <button
                className="cmx__btn cmx__btn--primary"
                onClick={fetchReconciliation}
                disabled={loading}
              >
                <Download />
                {loading
                  ? t("common.loading")
                  : t("crm.clients.details.loadReconciliation")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ClientModalPortal>
  );
}
