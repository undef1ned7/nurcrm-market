import type { ReactNode } from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Banknote, Wallet, X } from "lucide-react";

import type { DetailRow, DetailsView } from "../clientDetails.types";
import {
  toYYYYMMDD,
  toNumber,
  toDecimalString,
  getInstallmentRemaining,
} from "../clientDetails.helpers";
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
  const [partialAmount, setPartialAmount] = useState("");
  const [payingPartial, setPayingPartial] = useState(false);
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

  const partialAmountNum = toNumber(partialAmount);
  const partialAmountValid =
    Number.isFinite(partialAmountNum) &&
    partialAmountNum > 0 &&
    partialAmountNum <= totalDebt + 0.01;

  /**
   * Оплата произвольной суммы «в счёт долга» — гасит несколько сделок сразу,
   * от самых старых к новым (FIFO), пока сумма не закончится. Последний
   * задетый взнос может быть оплачен частично (см. `amount` в payDebtDeal) —
   * бэк уже поддерживает частичную оплату одного взноса, здесь просто
   * оркестрация по нескольким сделкам клиента. Бэк не умеет принять одну
   * сумму и распределить её сам — см. docs/backend/kassa/debt-pay-arbitrary-amount-backend.md.
   */
  const onPayPartialDebt = () => {
    if (payingAll || payingPartial || !clientId || debtRows.length === 0) return;
    if (!partialAmountValid) {
      setAlert({
        open: true,
        type: "error",
        message: t("crm.clients.details.enterValidPartialAmount", {
          max: totalDebt.toFixed(2),
        }),
      });
      return;
    }

    const amountToPay = partialAmountNum;

    setConfirmDialog({
      open: true,
      message: t("crm.clients.details.payPartialDebtConfirm", {
        amount: amountToPay.toFixed(2),
      }),
      onConfirm: async () => {
        setConfirmDialog({ open: false, message: "", onConfirm: null });
        setPayingPartial(true);

        const routing = isSupplier
          ? buildExpenseVariableRouting()
          : buildPosRoutingFromUser(profile, company);
        const today = toYYYYMMDD(new Date());

        // Показ (детали) — новые сверху; гасим — от старых к новым.
        const orderedRows = [...debtRows].sort((a, b) =>
          a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
        );

        let remainingToPay = amountToPay;
        let paidAnything = false;
        let failed = false;

        for (const row of orderedRows) {
          if (remainingToPay <= 0.01) break;
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
              if (remainingToPay <= 0.01) break;
              const instRemaining = getInstallmentRemaining(p);
              if (instRemaining <= 0) continue;

              const payNow = Math.min(instRemaining, remainingToPay);
              const isFullInstallment = payNow >= instRemaining - 0.01;

              const paymentData: any = {
                idempotency_key: crypto.randomUUID(),
                installment_id: p.id,
                date: today,
                note: "",
                ...routing,
              };
              if (!isFullInstallment) {
                paymentData.amount = toDecimalString(payNow);
              }

              await dispatch(
                payDebtDeal({ id: row.id, clientId, data: paymentData }),
              ).unwrap();

              void postCashflowIfNeeded(
                dispatch,
                {
                  type: isSupplier ? "expense" : "income",
                  name: t("crm.clients.details.debtPaymentName", {
                    name: counterpartyName,
                    n: p.number,
                  }),
                  amount: payNow.toFixed(2),
                  source_cashbox_flow_id: p.number,
                  source_business_operation_id: t(
                    "crm.clients.details.debtPayment",
                  ),
                },
                { warnOnFailure: true, failureContext: "debt" },
              );

              remainingToPay -= payNow;
              paidAnything = true;
            }
          } catch (e: any) {
            console.error(e);
            failed = true;
            break;
          }
        }

        setPayingPartial(false);
        onChanged?.();

        if (failed) {
          setAlert({
            open: true,
            type: "error",
            message: paidAnything
              ? t("crm.clients.details.payPartialPartialFail", {
                  paid: (amountToPay - Math.max(remainingToPay, 0)).toFixed(2),
                })
              : t("crm.clients.details.paymentError"),
          });
        } else {
          setPartialAmount("");
          onClose();
        }
      },
    });
  };

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

          {debtRows.length > 0 && (
            <div className="cmx__pay-partial">
              <label
                htmlFor="kpi-partial-amount"
                className="cmx__pay-partial-label"
              >
                {t(
                  "crm.clients.details.payPartialLabel",
                  "Оплатить часть долга",
                )}
              </label>
              <div className="cmx__pay-partial-row">
                <div className="cmx__pay-partial-input-wrap">
                  <input
                    id="kpi-partial-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    max={totalDebt}
                    className="cmx__input cmx__input--sm"
                    placeholder={t(
                      "crm.clients.details.payPartialPlaceholder",
                      "Сумма",
                    )}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    disabled={payingAll || payingPartial}
                  />
                  <span className="cmx__pay-partial-currency">
                    {t("common.currencySom")}
                  </span>
                </div>
                <button
                  type="button"
                  className="cmx__btn cmx__btn--secondary cmx__btn--sm"
                  onClick={onPayPartialDebt}
                  disabled={
                    payingAll || payingPartial || !partialAmountValid
                  }
                >
                  <Banknote size={16} />
                  {payingPartial
                    ? t("crm.clients.details.paying")
                    : t("crm.clients.details.payPartialAction", "Оплатить")}
                </button>
              </div>
            </div>
          )}

          <div className="cmx__footer">
            <div className="cmx__footer-left">
              {debtRows.length > 0 && (
                <div className="cmx__pay-all">
                  <button
                    type="button"
                    className="cmx__btn cmx__btn--primary"
                    onClick={onPayAllDebt}
                    disabled={payingAll || payingPartial}
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
