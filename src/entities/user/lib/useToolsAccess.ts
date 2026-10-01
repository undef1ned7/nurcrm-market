import { useUser } from "../model/userSlice";
import { isStartPlan } from "@shared/lib/subscriptionPlan";

/**
 * Доступ к разделам «Сводка / Калькуляция / ABC-анализ».
 * Владелец видит аналитику всегда; сотруднику нужна галочка «Аналитика».
 * ABC-анализ — с тарифа «Стандарт».
 */
export function useToolsAccess() {
  const { profile, currentUser, company } = useUser() as any;
  const user = profile ?? currentUser ?? null;
  const isOwner = user?.role === "owner";
  const canViewAnalytics = isOwner || user?.can_view_analytics === true;
  const isStartTariff = isStartPlan(company?.subscription_plan?.name);
  return {
    isOwner,
    canViewAnalytics,
    isStartTariff,
    canViewAbc: canViewAnalytics && !isStartTariff,
  };
}
