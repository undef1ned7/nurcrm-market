import type { ReactNode } from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Wallet, X } from "lucide-react";

import type { DetailRow, DetailsView } from "../clientDetails.types";
import { toYYYYMMDD, getInstallmentRemaining } from "../clientDetails.helpers";
import { getClientDealDetail, payDebtDeal } from "@entities/client";
import { postCashflowIfNeeded } from "@entities/cash";
import { useUser } from "@entities/user";
import {
  buildExpenseVariableRouting,
  buildPosRoutingFromUser,
} from "@shared/lib/tools/cashboxResolution";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
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
  category?: DetailsView;
  clientId?: string | number;
  clientType?: string;
  detailsMeta: ClientKpiDetailsMeta;
  detailRows: DetailRow[];
  onClose: () => void;
  onChanged?: () => void;
}

export function ClientKpiDetailDrawer({
  open,
  mode,
  category,
  clientId,
  clientType,
  detailsMeta,
  detailRows,
  onClose,
  onChanged,
}: ClientKpiDetailDrawerProps) {
  const dispatch = useDispatch() as any;
  const { t } = useTranslation();
  const { profile, company } = useUser();
  const isSupplier = String(clientType || "").toLowerCase() === "suppliers";

  const [payingAll, setPayingAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<any>({
    open: false,
    message: "",
    onConfirm: null,
  });
  const [alert, setAlert] = useState<any>({
    open: false,
    type: "error",
    message: "",
  });

  if (!open) return null;

  const debtRows =
    category === "debt"
      ? detailRows.filter((row) => row.id != null && row.amount > 0)
      : [];
  const totalDebt = debtRows.reduce((sum, row) => sum + row.amount, 0);

  const onPayAllDebt = () => {
    if (payingAll || !clientId || debtRows.length === 0) return;

    setConfirmDialog({
      open: true,
      message: t("crm.clients.details.payAllDebtsConfirm", {
        amount: totalDebt.toFixed(2),
        count: debtRows.length,
      }),
      onConfirm: async () => {
        setConfirmDialog({ open: false, message: "", onConfirm: null });
        setPayingAll(true);

        const routing = isSupplier
          ? buildExpenseVariableRouting()
          : buildPosRoutingFromUser(profile, company);
        const today = toYYYYMMDD(new Date());
        let paidDeals = 0;
        let failed = false;

        for (const row of debtRows) {
          try {
            const dealDetail = await dispatch(
              getClientDealDetail({ clientId, dealId: row.id }),
            ).unwrap();
            const installments = Array.isArray(dealDetail?.installments)
              ? dealDetail.installments
              : [];
            const pending = installments.filter(
              (p: any) => !p.paid_on && getInstallmentRemaining(p) > 0,
            );
            const counterpartyName =
              String(dealDetail?.client_full_name || "").trim() ||
              t("crm.clients.details.unknownCounterparty");

            for (const p of pending) {
              const remaining = getInstallmentRemaining(p);
              if (remaining <= 0) continue;
              await dispatch(
                payDebtDeal({
                  id: row.id,
                  clientId,
                  data: {
                    idempotency_key: crypto.randomUUID(),
                    installment_id: p.id,
                    date: today,
                    note: "",
                    ...routing,
                  },
                }),
              ).unwrap();
              void postCashflowIfNeeded(
                dispatch,
                {
                  type: isSupplier ? "expense" : "income",
                  name: t("crm.clients.details.debtPaymentName", {
                    name: counterpartyName,
                    n: p.number,
                  }),
                  amount: remaining.toFixed(2),
                  source_cashbox_flow_id: p.number,
                  source_business_operation_id: t(
                    "crm.clients.details.debtPayment",
                  ),
                },
                { warnOnFailure: true, failureContext: "debt" },
              );
            }
            paidDeals += 1;
          } catch (e: any) {
            console.error(e);
            failed = true;
            break;
          }
        }

        setPayingAll(false);
        onChanged?.();

        if (failed) {
          setAlert({
            open: true,
            type: "error",
            message:
              paidDeals > 0
                ? t("crm.clients.details.payAllDealsPartial", {
                    paid: paidDeals,
                    total: debtRows.length,
                  })
                : t("crm.clients.details.paymentError"),
          });
        } else {
          onClose();
        }
      },
    });
  };

  return (
    <ClientModalPortal wrapperId="client-details-kpi-modal">
      <div className="cmx__overlay" data-theme={mode} onClick={onClose}>
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
              aria-label={t("common.close")}
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
              <span className="cmx__kpi-total-label">
                {t("crm.clients.details.totalWord")}
              </span>
              <span className="cmx__kpi-total-value">
                {detailsMeta.total.toFixed(2)}
                <span>{t("common.currencySom")}</span>
              </span>
            </div>

            <div className="cmx__section-title">
              {t("crm.clients.details.operations")}
            </div>

            {detailRows.length === 0 ? (
              <div className="cmx__kpi-empty">
                {t("crm.clients.details.noCategoryData")}
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
                      <span>{t("common.currencySom")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cmx__footer">
            <div className="cmx__footer-left">
              {debtRows.length > 0 && (
                <div className="cmx__pay-all">
                  <button
                    type="button"
                    className="cmx__btn cmx__btn--primary"
                    onClick={onPayAllDebt}
                    disabled={payingAll}
                  >
                    <Wallet size={16} />{" "}
                    {payingAll
                      ? t("crm.clients.details.paying")
                      : t("crm.clients.details.payAllDebt")}
                  </button>
                </div>
              )}
            </div>
            <div className="cmx__footer-right">
              <button
                type="button"
                className="cmx__btn cmx__btn--ghost"
                onClick={onClose}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        open={alert.open}
        type={alert.type}
        title={"" as any}
        message={alert.message}
        okText="Ok"
        onClose={() => setAlert((a: any) => ({ ...a, open: false }))}
        onConfirm={undefined as any}
      />
      <AlertModal
        open={confirmDialog.open}
        type="info"
        title={"" as any}
        message={confirmDialog.message}
        okText={t("crm.clients.details.confirm")}
        onClose={() =>
          setConfirmDialog({ open: false, message: "", onConfirm: null })
        }
        onConfirm={() => {
          if (confirmDialog.onConfirm) {
            confirmDialog.onConfirm();
          }
        }}
      />
    </ClientModalPortal>
  );
}
