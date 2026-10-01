import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { CreditCard } from "lucide-react";
import { buildSubscriptionView } from "@shared/lib/subscriptionInfo";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

/**
 * Компактная карточка «Тариф» в Аналитике (только владелец).
 * Контракт: docs/backend/subscription-account-panel-backend.md;
 * полная версия — Настройки → «Тариф и оплата».
 */
export function AnalyticsSubscriptionCard({ vm }: { vm: AnalyticsVm }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { company, currentUser } = vm;

  const view = useMemo(() => buildSubscriptionView(company), [company]);

  if (currentUser?.role !== "owner" || !company) return null;

  const daysText =
    view.daysLeft == null
      ? t("settings.subscription.termNotSet")
      : view.daysLeft < 0
        ? t("settings.subscription.expiredAgo", { count: Math.abs(view.daysLeft) })
        : view.daysLeft === 0
          ? t("settings.subscription.expiresToday")
          : t("settings.subscription.daysLeft", { count: view.daysLeft });

  const tone =
    view.daysLeft == null
      ? "muted"
      : view.daysLeft < 0
        ? "danger"
        : view.daysLeft <= 7
          ? "warn"
          : "ok";

  const paidUntil = view.endDate
    ? view.endDate.toLocaleDateString(i18n.language === "ky" ? "ky-KG" : "ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="analytics-page__subscription">
      <CreditCard size={20} className="analytics-page__subscription-icon" />
      <div className="analytics-page__subscription-body">
        <span className="analytics-page__subscription-label">
          {t("crm.analytics.subscriptionCard.title")}
        </span>
        <span className="analytics-page__subscription-plan">
          {view.planName || t("settings.subscription.planUnknown")}
        </span>
        {paidUntil && (
          <span className="analytics-page__subscription-meta">
            {t("settings.subscription.paidUntil")}: {paidUntil}
          </span>
        )}
      </div>
      <span
        className={`analytics-page__subscription-days analytics-page__subscription-days--${tone}`}
      >
        {daysText}
      </span>
      <button
        type="button"
        className="nur-btn nur-btn--secondary analytics-page__subscription-link"
        onClick={() => navigate("/crm/set?tab=subscription")}
      >
        {t("crm.analytics.subscriptionCard.details")}
      </button>
    </div>
  );
}
