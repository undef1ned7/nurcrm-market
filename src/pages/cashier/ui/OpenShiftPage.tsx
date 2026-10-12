import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Wallet } from "lucide-react";
import { openShiftAsync } from "@entities/shift";
import { useUser } from "@entities/user";
import { resolveCashierId } from "@shared/lib/tools/cashierOpenShift";
import {
  buildPosRoutingFromUser,
  resolveBranchId,
  resolvePosCashboxRole,
} from "@shared/lib/tools/cashboxResolution";
import api from "@shared/api";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import "./OpenShiftPage.scss";

/**
 * Пытается найти однозначную кассу для явного `cashbox` в теле открытия
 * смены. Без него бэк резолвит кассу по подстроке в названии («основн» и
 * т.п.) — при нескольких активных кассах с одной ролью (известный баг, см.
 * docs/backend/kassa/pos-main-duplicate-role-bug.md) кассира может посадить
 * не на ту кассу. Если совпадение неоднозначно — просто не шлём `cashbox`,
 * поведение не меняется (старая маршрутизация по branch_id/cashbox_role),
 * а страхует уже `cashbox_warning` в ответе открытия/просмотра смены.
 */
async function resolveExplicitCashboxId(
  profile: any,
  company: any,
): Promise<string | null> {
  try {
    const role = resolvePosCashboxRole(profile, company);
    const branchId = resolveBranchId(profile, company);
    const { data } = await api.get("/construction/cashboxes/");
    const list: any[] = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    const candidates = list.filter((c: any) => {
      if (c?.is_active === false) return false;
      if (String(c?.role || "") !== role) return false;
      if (role === "pos_branch" && branchId) {
        return String(c?.branch_id ?? c?.branch ?? "") === String(branchId);
      }
      return true;
    });
    return candidates.length === 1 ? String(candidates[0].id) : null;
  } catch {
    return null;
  }
}

const OpenShiftPage = ({ onBack }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const { currentUser, userId, profile, company } = useUser();

  const [openingCash, setOpeningCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: string;
    title: string;
    message: any;
  }>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });
  // Смена уже открыта (пришла с cashbox_warning) — уходим со страницы только
  // после того, как кассир осознанно закроет предупреждение.
  const [pendingBackAfterWarning, setPendingBackAfterWarning] = useState(false);

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
    if (pendingBackAfterWarning) {
      setPendingBackAfterWarning(false);
      onBack();
    }
  };

  const handleOpenShift = async () => {
    // Валидация
    const cashAmount = parseFloat(openingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      showAlert("error", t("common.error"), t("crm.cashier.shift.alerts.invalidAmount"));
      return;
    }

    const cashierId = resolveCashierId({ currentUser, userId, profile });

    try {
      setLoading(true);
      // Явный cashbox — чтобы бэк не выбирал кассу по подстроке в названии
      // (см. resolveExplicitCashboxId выше). Если однозначной кассы нет —
      // просто не передаём поле, ведёт себя как раньше.
      const explicitCashboxId = await resolveExplicitCashboxId(profile, company);

      const response = await dispatch(
        openShiftAsync({
          ...(cashierId ? { cashier: cashierId } : {}),
          opening_cash: String(cashAmount),
          ...buildPosRoutingFromUser(profile, company),
          ...(explicitCashboxId ? { cashbox: explicitCashboxId } : {}),
        })
      ).unwrap();

      const warning = response?.cashbox_warning;
      if (warning?.message) {
        // Кассир открыл смену на кассе, где уже есть чужой остаток —
        // модалка, требующая подтверждения, а не toast (иначе смена
        // останется неправильной на весь день незамеченной).
        const openShifts = Array.isArray(warning.open_shifts)
          ? warning.open_shifts
          : [];
        setAlertModal({
          open: true,
          type: "warning",
          title: t("crm.cashier.shift.alerts.cashboxWarningTitle"),
          message: (
            <>
              <p>{warning.message}</p>
              {openShifts.length > 0 && (
                <ul className="open-shift-page__warning-list">
                  {openShifts.map((s: any, i: number) => (
                    <li key={i}>
                      {s.cashier_display || "—"}:{" "}
                      <strong>
                        {s.drawer_expected_cash != null
                          ? `${parseFloat(String(s.drawer_expected_cash)).toFixed(2)} сом`
                          : "—"}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) as any,
        });
        setPendingBackAfterWarning(true);
        return;
      }

      showAlert("success", t("common.success"), t("crm.cashier.shift.alerts.openSuccess"));
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
