import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Wallet } from "lucide-react";
import { openShiftAsync } from "@entities/shift";
import { fetchShiftsAsync } from "@entities/shift";
import { useUser } from "@entities/user";
import { buildPosRoutingFromUser } from "@shared/lib/tools/cashboxResolution";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import "./OpenShiftPage.scss";

const OpenShiftPage = ({ onBack }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const { currentUser, userId, profile, company } = useUser();

  const [openingCash, setOpeningCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertModal({
      open: true,
      type,
      title,
      message,
    });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, open: false }));
  };

  const handleOpenShift = async () => {
    // Валидация
    const cashAmount = parseFloat(openingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      showAlert("error", t("common.error"), t("crm.cashier.shift.alerts.invalidAmount"));
      return;
    }

    // Кассу выбирает бэкенд по branch_id / cashbox_role
    const cashierId = currentUser?.id || userId;

    if (!cashierId) {
      showAlert("error", t("common.error"), t("crm.cashier.shift.alerts.cashierNotFound"));
      return;
    }

    try {
      setLoading(true);
      // Отправляем запрос на открытие смены
      await dispatch(
        openShiftAsync({
          cashier: cashierId,
          opening_cash: String(cashAmount),
          ...buildPosRoutingFromUser(profile, company),
        })
      ).unwrap();

      showAlert("success", t("common.success"), t("crm.cashier.shift.alerts.openSuccess"));
      // Обновляем список смен
      dispatch((fetchShiftsAsync as any)());
      // Закрываем экран через небольшую задержку
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error: any) {
      console.error("Ошибка при открытии смены:", error);
      showAlert(
        "error",
        t("common.error"),
        error?.data?.detail || error?.message || t("crm.cashier.shift.alerts.openFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="open-shift-page">
      <div className="open-shift-page__header">
        <button
          className="open-shift-page__back-btn"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="open-shift-page__title">{t("crm.cashier.shift.openTitle")}</h1>
      </div>

      <div className="open-shift-page__content">
        <div className="open-shift-page__card">
          <div className="open-shift-page__icon">
            <Wallet size={48} style={{ color: "#22c55e" }} />
          </div>
          <h2 className="open-shift-page__card-title">{t("crm.cashier.shift.openingAmount")}</h2>
          <p className="open-shift-page__card-description">
            {t("crm.cashier.shift.openingHint")}
          </p>

          <div className="open-shift-page__input-wrapper">
            <label className="open-shift-page__label">
              {t("crm.cashier.shift.cashAmountLabel")}
            </label>
            <input
              type="number"
              className="open-shift-page__input"
              value={openingCash}
              onChange={(e: any) =>  setOpeningCash( e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              autoFocus
              disabled={loading}
            />
          </div>

          <button
            className="open-shift-page__submit-btn"
            onClick={handleOpenShift}
            disabled={loading || !openingCash}
          >
            {loading ? t("crm.cashier.shift.opening") : t("crm.cashier.shift.openShift")}
          </button>
        </div>
      </div>

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        okText="ОК"
        onClose={closeAlert}
        onConfirm={closeAlert}
      />
    </div>
  );
};

export default OpenShiftPage;
