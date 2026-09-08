import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  buildSubscriptionView,
  type SubscriptionStatus,
} from "@shared/lib/subscriptionInfo";

const STATUS_LABEL_KEY: Record<SubscriptionStatus, string> = {
  active: "settings.subscription.statusActive",
  expiring_soon: "settings.subscription.statusExpiringSoon",
  expired: "settings.subscription.statusExpired",
  trial: "settings.subscription.statusTrial",
  grace: "settings.subscription.statusGrace",
  unknown: "settings.subscription.statusUnknown",
};

/** Settings tab: Тариф и оплата (только владелец). */
export function SubscriptionTab(props: any) {
  const { t, i18n } = useTranslation();
  const { company } = props;

  const view = useMemo(() => buildSubscriptionView(company), [company]);

  const fmtDate = (date: Date | null) => {
    if (!date) return t("settings.subscription.dash");
    try {
      return date.toLocaleDateString(i18n.language === "ky" ? "ky-KG" : "ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return date.toISOString().slice(0, 10);
    }
  };

  const fmtMoney = (amount: string | null, currency: string | null) => {
    if (amount == null) return t("settings.subscription.dash");
    const n = Number(amount);
    const num = Number.isFinite(n)
      ? n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
      : amount;
    return currency ? `${num} ${currency}` : num;
  };

  const periodLabel =
    view.period === "month"
      ? t("settings.subscription.periodMonth")
      : view.period === "year"
        ? t("settings.subscription.periodYear")
        : "";

  const daysLeftText = (() => {
    if (view.daysLeft == null) return t("settings.subscription.termNotSet");
    if (view.daysLeft < 0) {
      return t("settings.subscription.expiredAgo", { count: Math.abs(view.daysLeft) });
    }
    if (view.daysLeft === 0) return t("settings.subscription.expiresToday");
    return t("settings.subscription.daysLeft", { count: view.daysLeft });
  })();

  const daysToneClass =
    view.daysLeft == null
      ? "settings__sub-days--muted"
      : view.daysLeft < 0
        ? "settings__sub-days--danger"
        : view.daysLeft <= 7
          ? "settings__sub-days--warn"
          : "settings__sub-days--ok";

  const limitName = (key: string) => {
    const map: Record<string, string> = {
      employees: "settings.subscription.limitEmployees",
      warehouses: "settings.subscription.limitWarehouses",
      products: "settings.subscription.limitProducts",
    };
    return map[key] ? t(map[key]) : key;
  };

  const detailRows: Array<{ label: string; value: string }> = [];
  detailRows.push({
    label: t("settings.subscription.status"),
    value: t(STATUS_LABEL_KEY[view.status]),
  });
  if (view.startedAt) {
    detailRows.push({
      label: t("settings.subscription.startedAt"),
      value: fmtDate(view.startedAt),
    });
  }
  if (view.nextPaymentAt) {
    detailRows.push({
      label: t("settings.subscription.nextPayment"),
      value: fmtDate(view.nextPaymentAt),
    });
  }
  if (view.autoRenew !== null) {
    detailRows.push({
      label: t("settings.subscription.autoRenew"),
      value: view.autoRenew
        ? t("settings.subscription.on")
        : t("settings.subscription.off"),
    });
  }
  if (view.isTrial) {
    detailRows.push({
      label: t("settings.subscription.trial"),
      value: t("settings.subscription.yes"),
    });
  }
  if (view.lastPayment && view.lastPayment.amount != null) {
    detailRows.push({
      label: t("settings.subscription.lastPayment"),
      value: t("settings.subscription.paymentOn", {
        amount: fmtMoney(view.lastPayment.amount, view.lastPayment.currency),
        date: fmtDate(view.lastPayment.paidAt),
      }),
    });
  }

  return (
    <div className="settings__tab-content">
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">💳</span>{" "}
          {t("settings.subscription.sectionTitle")}
        </h2>
        <p className="settings__mutedText">{t("settings.subscription.hint")}</p>

        <div className="settings__cardsGrid settings__sub-grid">
          {/* Аккаунт открыт */}
          <div className="settings__card">
            <div className="settings__sub-cardLabel">
              {t("settings.subscription.accountOpened")}
            </div>
            <div className="settings__sub-cardValue">
              {fmtDate(view.accountCreatedAt)}
            </div>
          </div>

          {/* Тариф */}
          <div className="settings__card">
            <div className="settings__sub-cardLabel">
              {t("settings.subscription.plan")}
            </div>
            <div className="settings__sub-cardValue">
              {view.planName || t("settings.subscription.planUnknown")}
            </div>
            {view.price != null && (
              <div className="settings__sub-cardSub">
                {fmtMoney(view.price, view.currency)}
                {periodLabel ? ` / ${periodLabel}` : ""}
              </div>
            )}
          </div>

          {/* Оплачено до / осталось дней */}
          <div className="settings__card">
            <div className="settings__sub-cardLabel">
              {t("settings.subscription.paidUntil")}
            </div>
            <div className="settings__sub-cardValue">{fmtDate(view.endDate)}</div>
            <div className={`settings__sub-days ${daysToneClass}`}>
              {daysLeftText}
            </div>
          </div>
        </div>

        {/* Детали */}
        <dl className="settings__sub-details">
          {detailRows.map((row) => (
            <div className="settings__sub-detailRow" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* Лимиты */}
        {view.limits.length > 0 && (
          <>
            <h3 className="settings__sub-subtitle">
              {t("settings.subscription.limits")}
            </h3>
            <dl className="settings__sub-details">
              {view.limits.map((limit) => (
                <div className="settings__sub-detailRow" key={limit.key}>
                  <dt>{limitName(limit.key)}</dt>
                  <dd>
                    {limit.max == null
                      ? `${limit.used ?? "—"} · ${t("settings.subscription.limitUnlimited")}`
                      : t("settings.subscription.limitValue", {
                          used: limit.used ?? 0,
                          max: limit.max,
                        })}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {!view.hasBackendDetail && (
          <p className="settings__mutedText settings__sub-note">
            {t("settings.subscription.backendPending")}
          </p>
        )}
      </div>
    </div>
  );
}
