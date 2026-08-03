import { Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useUser } from "@entities/user";
import { useAlert } from "@shared/hooks/useDialog";
import { getCompanySubscriptionStatus } from "@shared/lib/companySubscription";

const SUBSCRIPTION_FALLBACK_PATH = "/";

const ProtectedRoute = ({ children }) => {
  const { company, companyLoading } = useUser();
  const alert = useAlert();
  const notifiedRef = useRef(null);

  const subscription = getCompanySubscriptionStatus(company);

  useEffect(() => {
    if (companyLoading || !company) return;
    if (subscription.ok || !subscription.message) return;
    if (notifiedRef.current === subscription.reason) return;

    notifiedRef.current = subscription.reason;
    alert(subscription.message, true);
  }, [
    company,
    companyLoading,
    subscription.ok,
    subscription.reason,
    subscription.message,
    alert,
  ]);

  if (companyLoading) {
    return <div>Загрузка...</div>;
  }

  // Компания ещё не загружена — не блокируем (AuthGuard/Layout подтянут)
  if (!company) {
    return children;
  }

  if (!subscription.ok) {
    return <Navigate to={SUBSCRIPTION_FALLBACK_PATH} replace />;
  }

  return children;
};

export default ProtectedRoute;
