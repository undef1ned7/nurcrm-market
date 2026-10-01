import { useEffect, useState, useMemo, useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import "./Settings.scss";
import Tabs from "../Tabs/Tabs";
import {
  getProfile,
  logoutUser,
  useUser,
} from "@entities/user";
import { useDispatch } from "react-redux";
import {
  updateUserCompanyName,
  updateUserData,
  getScalesToken,
  getCompany,
} from "@entities/user";
import { checkSlug } from "@entities/user/api/auth";
import {
  normalizeSlug,
  finalizeSlug,
  validateSlug,
} from "@shared/lib/slug";
import { redirectToMainAppLogin } from "@shared/lib/appUrls";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import { Sun, Moon } from "lucide-react";
import CafeReceiptPrinterSettings from "./CafeReceiptPrinterSettings";
import CafeKitchenPrintersSettings from "./CafeKitchenPrintersSettings";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { canAccessOnlineShowcase } from "@shared/lib/subscriptionPlan";
import { CASHIER_DESKTOP_BUTTON_STORAGE_KEY } from "@shared/lib/desktopCashierApp";
import {
  fetchMarketCashierSettings,
  normalizeMarketCashierSettings,
  updateMarketCashierSettings,
} from "@shared/api/marketCashierSettings";
import { cashflowRequestsSettingUpdated } from "@entities/cash";
import { PageShell, PageHeader, PagePanel } from "@shared/ui/page-shell";
import { CompanyTab } from "./tabs/CompanyTab";
import { SubscriptionTab } from "./tabs/SubscriptionTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { CashierTab } from "./tabs/CashierTab";
import { ScalesTokenTab } from "./tabs/ScalesTokenTab";
import { InterfaceTab } from "./tabs/InterfaceTab";
import { OnlineTab } from "./tabs/OnlineTab";
import { PrintTab } from "./tabs/PrintTab";
import {
  ALL_SETTINGS_TABS,
  SETTINGS_TABS,
  type SettingsTabId,
} from "../settingsTabs";

/* helpers */
const safeOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const SCALE_BARCODE_MODE_VALUES = [
  { value: "auto", labelKey: "settings.company.scaleBarcodeAuto" },
  { value: "weight", labelKey: "settings.company.scaleBarcodeWeight" },
  { value: "amount", labelKey: "settings.company.scaleBarcodeAmount" },
] as const;

const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;

  const { tariff, errorChange: errors, company, profile } = useUser();

  // Определяем, является ли сфера "магазин" (market)
  const isMarketSector = useMemo(() => {
    if (!company?.sector?.name) return false;
    const sectorName = String(company.sector.name).toLowerCase().trim();
    return (
      sectorName === "магазин" ||
      sectorName === "цветочный магазин" ||
      sectorName.includes("магазин")
    );
  }, [company?.sector?.name]);

  // Определяем, является ли пользователь владельцем
  const isOwner = useMemo(() => profile?.role === "owner", [profile?.role]);
  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);

  // Вкладка «Касса» (код удаления и лимит скидки) — только владелец/админ магазина
  const canViewMarketCashierSettings = useMemo(
    () => isMarketSector && (isOwner || isAdmin),
    [isMarketSector, isOwner, isAdmin]
  );
  // «Запросы на кассе» — та же вкладка, но для любой сферы (владелец/админ)
  const canViewCashboxRequestsSetting = useMemo(
    () => isOwner || isAdmin,
    [isOwner, isAdmin]
  );
  const canViewCashierTab = useMemo(
    () => canViewMarketCashierSettings || canViewCashboxRequestsSetting,
    [canViewMarketCashierSettings, canViewCashboxRequestsSetting]
  );

  const canViewOnline = useMemo(() => {
    const hasSlug = Boolean(company?.slug);
    const canViewShowcase = Boolean(profile?.can_view_showcase);
    if (!hasSlug) return false;
    return canAccessOnlineShowcase({
      tariffName: tariff || company?.subscription_plan?.name,
      sectorName: company?.sector?.name,
      isOwner,
      canViewShowcase,
    });
  }, [
    company?.slug,
    company?.subscription_plan?.name,
    company?.sector?.name,
    profile?.can_view_showcase,
    isOwner,
    tariff,
  ]);

  // Определяем начальный активный таб в зависимости от доступных табов
  const initialTab = useMemo((): SettingsTabId => {
    // Глубокая ссылка `/crm/set?tab=subscription` (напр. из карточки тарифа
    // в Аналитике). Недоступный роли таб поправит эффект ниже.
    const requested =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null;
    if (requested && ALL_SETTINGS_TABS.includes(requested as SettingsTabId)) {
      return requested as SettingsTabId;
    }
    if (isOwner) return SETTINGS_TABS.company;
    if (isMarketSector) return SETTINGS_TABS.scalesToken;
    if (canViewOnline) return SETTINGS_TABS.online;
    return SETTINGS_TABS.security;
  }, [isOwner, isMarketSector, canViewOnline]);

  // Инициализируем настройку сайдбара из localStorage при загрузке (только один раз)
  useEffect(() => {
    const saved = localStorage.getItem("sidebarAutoClose");
    if (saved === null) {
      localStorage.setItem("sidebarAutoClose", "false");
    }
  }, []);

  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    SETTINGS_TABS.security,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Устанавливаем начальный таб при первой загрузке данных
  useEffect(() => {
    if (company && profile && !isInitialized) {
      setActiveTab(initialTab);
      setIsInitialized(true);
    }
  }, [company, profile, initialTab, isInitialized]);

  // Обновляем активный таб, если текущий стал недоступен
  useEffect(() => {
    if (!isInitialized) return;

    if (
      (activeTab === SETTINGS_TABS.company ||
        activeTab === SETTINGS_TABS.subscription) &&
      !isOwner
    ) {
      setActiveTab(
        isMarketSector
          ? SETTINGS_TABS.scalesToken
          : canViewOnline
            ? SETTINGS_TABS.online
            : SETTINGS_TABS.security,
      );
    } else if (activeTab === SETTINGS_TABS.scalesToken && !isMarketSector) {
      setActiveTab(
        isOwner
          ? SETTINGS_TABS.company
          : canViewOnline
            ? SETTINGS_TABS.online
            : SETTINGS_TABS.security,
      );
    } else if (activeTab === SETTINGS_TABS.online && !canViewOnline) {
      setActiveTab(
        isOwner
          ? SETTINGS_TABS.company
          : isMarketSector
            ? SETTINGS_TABS.scalesToken
            : SETTINGS_TABS.security,
      );
    } else if (activeTab === SETTINGS_TABS.cashier && !canViewCashierTab) {
      setActiveTab(
        isOwner
          ? SETTINGS_TABS.company
          : isMarketSector
            ? SETTINGS_TABS.scalesToken
            : SETTINGS_TABS.security,
      );
    }
  }, [
    isMarketSector,
    isOwner,
    activeTab,
    isInitialized,
    canViewOnline,
    canViewCashierTab,
  ]);

  /* ===== Вкладка «Касса»: код удаления, лимит скидки, заявки на подтверждение ===== */
  const [cashierSettings, setCashierSettings] = useState({
    deleteCode: "",
    maxDiscountPercent: "",
    debtScheduleVersion: "v2" as "v1" | "v2",
    cashflowRequestsEnabled: false,
  });
  const [cashierSettingsLoading, setCashierSettingsLoading] = useState(false);
  const [cashierSettingsSaving, setCashierSettingsSaving] = useState(false);
  const [cashierSettingsError, setCashierSettingsError] = useState("");
  const [showCashierDeleteCode, setShowCashierDeleteCode] = useState(false);

  useEffect(() => {
    if (!canViewCashierTab) return undefined;
    let cancelled = false;

    const load = async () => {
      setCashierSettingsLoading(true);
      setCashierSettingsError("");
      try {
        const data = await fetchMarketCashierSettings();
        if (cancelled) return;
        const normalized = normalizeMarketCashierSettings(data);
        setCashierSettings({
          deleteCode: normalized.deleteCode,
          maxDiscountPercent:
            normalized.maxDiscountPercent == null
              ? ""
              : String(normalized.maxDiscountPercent),
          debtScheduleVersion: normalized.debtScheduleVersion || "v2",
          cashflowRequestsEnabled: normalized.cashflowRequestsEnabled,
        });
      } catch (err: any) {
        if (cancelled) return;
        setCashierSettingsError(
          validateResErrors(err, t("settings.alerts.cashierLoadFailed"))
        );
      } finally {
        if (!cancelled) setCashierSettingsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [canViewCashierTab]);

  const handleSaveCashierSettings = async (e) => {
    e.preventDefault();
    if (!canViewCashierTab) return;

    const code = String(cashierSettings.deleteCode || "").trim();
    if (code && !/^\d{4,8}$/.test(code)) {
      showAlert("error", t("settings.alerts.deleteCodeInvalid"));
      return;
    }

    const rawPercent = String(cashierSettings.maxDiscountPercent || "")
      .trim()
      .replace(",", ".");
    let percent: any = null;
    if (rawPercent !== "") {
      percent = parseFloat(rawPercent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        showAlert("error", t("settings.alerts.maxDiscountInvalid"));
        return;
      }
    }

    setCashierSettingsSaving(true);
    try {
      const data = await updateMarketCashierSettings({
        ...(isMarketSector
          ? {
              delete_item_code: code || null,
              max_discount_percent: percent === null ? null : String(percent),
              debt_schedule_version: cashierSettings.debtScheduleVersion || "v2",
            }
          : {}),
        cashflow_requests_enabled: Boolean(cashierSettings.cashflowRequestsEnabled),
      });
      const normalized = normalizeMarketCashierSettings(data);
      setCashierSettings({
        deleteCode: normalized.deleteCode || code,
        maxDiscountPercent:
          normalized.maxDiscountPercent == null
            ? percent === null
              ? ""
              : String(percent)
            : String(normalized.maxDiscountPercent),
        debtScheduleVersion: normalized.debtScheduleVersion || "v2",
        cashflowRequestsEnabled: normalized.cashflowRequestsEnabled,
      });
      dispatch(cashflowRequestsSettingUpdated(normalized.cashflowRequestsEnabled) as any);
      setCashierSettingsError("");
      showAlert("success", t("settings.alerts.cashierSaved"));
    } catch (err: any) {
      showAlert(
        "error",
        validateResErrors(err, t("settings.alerts.cashierSaveFailed"))
      );
    } finally {
      setCashierSettingsSaving(false);
    }
  };

  const [saving, setSaving] = useState(false);

  // --- AlertModal
  const [alertModal, setAlertModal] = useState({
    open: false,
    type: "success",
    message: "",
  });

  const showAlert = (type, message) =>
    setAlertModal({ open: true, type, message });
  const closeAlert = () =>
    setAlertModal({ open: false, type: "success", message: "" });

  // --- Настройки интерфейса (сайдбар)
  const [sidebarAutoClose, setSidebarAutoClose] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarAutoClose");
      if (saved === null) return false;
      return saved === "true";
    }
    return false;
  });

  // --- Кнопка "Касса" (скачивание desktop-приложения) в шапке
  const [cashierDesktopButtonEnabled, setCashierDesktopButtonEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CASHIER_DESKTOP_BUTTON_STORAGE_KEY);
      if (saved === null) return true;
      return saved === "true";
    }
    return true;
  });

  // --- Пароли
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    new_password2: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    repeat: false,
    cashier: false,
  });

  // --- Данные компании
  const [companyState, setCompanyState] = useState({
    name: company?.name || "",
    llc: company?.llc || "",
    inn: company?.inn || "",
    okpo: company?.okpo || "",
    score: company?.score || "",
    bik: company?.bik || "",
    address: company?.address || "",
    phones_howcase: company?.phones_howcase || "",
    cashier_password: company?.cashier_password || "",
    scale_barcode_mode: company?.scale_barcode_mode || "auto",
  });

  useEffect(() => {
    setCompanyState({
      name: company?.name || "",
      llc: company?.llc || "",
      inn: company?.inn || "",
      okpo: company?.okpo || "",
      score: company?.score || "",
      bik: company?.bik || "",
      address: company?.address || "",
      phones_howcase: company?.phones_howcase || "",
      cashier_password: company?.cashier_password || "",
      scale_barcode_mode: company?.scale_barcode_mode || "auto",
    });
  }, [company]);

  useEffect(() => {
    dispatch(getProfile(undefined as any));
  }, [dispatch]);

  const togglePasswordVisibility = (field) =>
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyState((prev) => ({ ...prev, [name]: value }));
  };

  const passwordsMismatch = useMemo(() => {
    return (
      formData.new_password.trim() !== "" &&
      formData.new_password2.trim() !== "" &&
      formData.new_password !== formData.new_password2
    );
  }, [formData.new_password, formData.new_password2]);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (profile?.role !== "owner") return;

    setSaving(true);
    try {
      const payload = { ...companyState };
      if (!String(payload.cashier_password || "").trim()) {
        delete payload.cashier_password;
      }
      await dispatch(updateUserCompanyName(payload)).unwrap();
      await dispatch(getCompany(undefined as any));
      showAlert("success", t("settings.alerts.companySaved"));
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("settings.alerts.companySaveFailed"));
      showAlert("error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();

    const anyPasswordFilled = Object.values(formData).some(
      (s) => s.trim() !== ""
    );
    if (!anyPasswordFilled) {
      showAlert("warning", t("settings.alerts.passwordFieldsRequired"));
      return;
    }

    if (passwordsMismatch) {
      showAlert("error", t("settings.alerts.passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(updateUserData(formData)).unwrap();
      showAlert("success", t("settings.alerts.passwordSaved"));
      setFormData({
        current_password: "",
        new_password: "",
        new_password2: "",
      });
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("settings.alerts.passwordSaveFailed"));
      showAlert("error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleResetCompany = () => {
    setCompanyState({
      name: company?.name || "",
      llc: company?.llc || "",
      inn: company?.inn || "",
      okpo: company?.okpo || "",
      score: company?.score || "",
      bik: company?.bik || "",
      address: company?.address || "",
      phones_howcase: company?.phones_howcase || "",
      cashier_password: company?.cashier_password || "",
      scale_barcode_mode: company?.scale_barcode_mode || "auto",
    });
  };

  const handleResetPassword = () => {
    setFormData({ current_password: "", new_password: "", new_password2: "" });
  };

  const handleSaveInterfaceSettings = async (e) => {
    e.preventDefault();
    try {
      localStorage.setItem("sidebarAutoClose", String(sidebarAutoClose));
      localStorage.setItem(
        CASHIER_DESKTOP_BUTTON_STORAGE_KEY,
        String(cashierDesktopButtonEnabled),
      );
      showAlert("success", t("settings.alerts.interfaceSaved"));
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("settings.alerts.interfaceSaveFailed"));
      showAlert("error", errorMessage);
    }
  };

  // Создание токена для весов (оставил как у тебя; если хочешь — переведу в React-модалку без DOM-колхоза)
  const handleCreateScalesToken = async () => {
    try {
      const result = await dispatch(getScalesToken(undefined as any)).unwrap();
      const token =
        result?.scale_api_token ||
        result?.token ||
        result?.access_token ||
        (typeof result === "string" ? result : null);

      if (!token) {
        showAlert("error", t("settings.alerts.tokenNotFound"));
        return;
      }

      const tokenString = String(token);

      const modal = document.createElement("div");
      modal.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000;
      `;

      const modalContent = document.createElement("div");
      modalContent.style.cssText = `
        background: var(--nur-surface);
        color: var(--nur-text);
        padding: 24px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        box-shadow: var(--nur-shadow-lg);
        border: 1px solid var(--nur-border);
      `;

      const title = document.createElement("h3");
      title.style.cssText =
        "margin:0 0 16px;font-size:18px;font-weight:600;color:var(--nur-text);";
      title.textContent = t("settings.scalesToken.modalTitle");

      const hint = document.createElement("p");
      hint.style.cssText = "margin:0 0 12px;color:var(--nur-muted);font-size:14px;";
      hint.textContent = t("settings.scalesToken.modalHint");

      const tokenBox = document.createElement("div");
      tokenBox.style.cssText =
        "background:var(--nur-surface-3);color:var(--nur-text);padding:12px;border-radius:4px;margin-bottom:16px;word-break:break-all;font-family:monospace;font-size:12px;";
      tokenBox.textContent = tokenString;

      const actions = document.createElement("div");
      actions.style.cssText =
        "display:flex;gap:8px;justify-content:flex-end;";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = t("settings.copy");
      copyBtn.style.cssText =
        "padding:8px 16px;background:var(--nur-info);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;";

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = t("common.close");
      closeBtn.style.cssText =
        "padding:8px 16px;background:var(--nur-surface-3);color:var(--nur-text);border:1px solid var(--nur-border);border-radius:4px;cursor:pointer;font-size:14px;";

      actions.appendChild(copyBtn);
      actions.appendChild(closeBtn);
      modalContent.appendChild(title);
      modalContent.appendChild(hint);
      modalContent.appendChild(tokenBox);
      modalContent.appendChild(actions);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      copyBtn.onclick = () => {
        navigator.clipboard
          .writeText(tokenString)
          .then(() => {
            copyBtn.textContent = t("settings.scalesToken.copied");
            copyBtn.style.background = "#f7d74f";
            setTimeout(() => {
              copyBtn.textContent = t("settings.copy");
              copyBtn.style.background = "#2563eb";
            }, 2000);
          })
          .catch(() => {
            showAlert("error", t("settings.alerts.copyFailed", { token: tokenString }));
          });
      };

      closeBtn.onclick = () => document.body.removeChild(modal);
      modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
      };
    } catch (err: any) {
      const errorMessage = validateResErrors(err, "Ошибка при создании токена");
      showAlert("error", errorMessage);
      // const errorMessage =
      //   err?.detail ||
      //   err?.message ||
      //   (typeof err === "string" ? err : "Не удалось создать токен");
      // showAlert("error", `Ошибка: ${errorMessage}`);
    }
  };

  const { mode, setMode, darkPalette, setDarkPalette } =
    useContext(ThemeModeContext);

  /* ===== Онлайн: ссылки ===== */
  const sectorName = useMemo(
    () =>
      String(company?.sector?.name || "")
        .toLowerCase()
        .trim(),
    [company?.sector?.name]
  );

  const isBarberSector = useMemo(() => {
    return (
      sectorName === "барбершоп" ||
      sectorName === "услуги" ||
      sectorName === "стоматология" ||
      sectorName === "салон красоты" ||
      sectorName.includes("барбер") ||
      sectorName.includes("парикмахер")
    );
  }, [sectorName]);

  const isCafeSector = useMemo(() => {
    return (
      sectorName === "кафе" ||
      sectorName.includes("кафе") ||
      sectorName.includes("ресторан")
    );
  }, [sectorName]);

  const isProductionSector = useMemo(() => {
    return (
      sectorName === "производство" ||
      sectorName === "production" ||
      sectorName.includes("производ")
    );
  }, [sectorName]);

  const onlineMenuUrl = useMemo(() => {
    if (!company?.slug) return "";

    // Определяем тип сектора
    const isMarket =
      sectorName === "магазин" ||
      sectorName === "цветочный магазин" ||
      sectorName.includes("магазин");

    // Генерируем URL в зависимости от типа сектора
    if (isMarket) {
      return `${safeOrigin()}/catalog/${company.slug}`;
    }
    if (isProductionSector) {
      return `${safeOrigin()}/production/${company.slug}`;
    }
    if (isCafeSector) {
      return `${safeOrigin()}/cafe/${company.slug}/menu`;
    }

    return "";
  }, [company?.slug, sectorName, isCafeSector, isProductionSector]);

  const onlineBookingUrl = useMemo(() => {
    if (!company?.slug || !isBarberSector) return "";
    return `${safeOrigin()}/service/${company.slug}/booking`;
  }, [company?.slug, isBarberSector]);

  /* ===== Редактирование slug компании (вкладка «Онлайн») ===== */
  const canEditSlug = isOwner || profile?.role === "admin";
  const [slugInput, setSlugInput] = useState(company?.slug || "");
  const [slugError, setSlugError] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  // null = не проверяли, true/false = результат проверки уникальности
  const [slugAvailable, setSlugAvailable] = useState<any>(null);
  const [slugSaving, setSlugSaving] = useState(false);

  // Синхронизируем поле с компанией при её загрузке/смене
  useEffect(() => {
    setSlugInput(company?.slug || "");
    setSlugError("");
    setSlugAvailable(null);
  }, [company?.slug]);

  const slugChanged = finalizeSlug(slugInput) !== (company?.slug || "");

  const handleSlugChange = (e) => {
    const next = normalizeSlug(e.target.value);
    setSlugInput(next);
    setSlugAvailable(null);
    const { valid, error } = validateSlug(finalizeSlug(next));
    setSlugError(next && !valid ? error : "");
  };

  // Дебаунс async-проверки уникальности slug
  useEffect(() => {
    if (!canEditSlug) return undefined;
    const candidate = finalizeSlug(slugInput);
    if (!slugChanged) {
      setSlugAvailable(null);
      return undefined;
    }
    const { valid } = validateSlug(candidate);
    if (!valid) {
      setSlugAvailable(null);
      return undefined;
    }
    let cancelled = false;
    setSlugChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await checkSlug(candidate);
        if (cancelled) return;
        const available = Boolean(res?.available);
        setSlugAvailable(available);
        if (!available) setSlugError(res?.message || "Slug уже существует");
        else setSlugError("");
      } catch (_e) {
        if (!cancelled) setSlugAvailable(null); // сеть/нет эндпоинта — не блокируем жёстко
      } finally {
        if (!cancelled) setSlugChecking(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
     
  }, [slugInput, slugChanged, canEditSlug]);

  const canSaveSlug =
    canEditSlug &&
    slugChanged &&
    !slugSaving &&
    !slugChecking &&
    validateSlug(finalizeSlug(slugInput)).valid &&
    slugAvailable !== false;

  const handleSaveSlug = async () => {
    const candidate = finalizeSlug(slugInput);
    const { valid, error } = validateSlug(candidate);
    if (!valid) {
      setSlugError(error);
      return;
    }
    setSlugSaving(true);
    try {
      await dispatch(updateUserCompanyName({ slug: candidate })).unwrap();
      await dispatch(getCompany(undefined as any));
      setSlugAvailable(null);
      showAlert("success", t("settings.alerts.slugSaved"));
    } catch (e: any) {
      const msg = validateResErrors(e, "Не удалось сохранить slug");
      setSlugError(typeof msg === "string" ? msg : "Slug уже существует");
      showAlert("error", typeof msg === "string" ? msg : t("settings.alerts.slugSaveFailed"));
    } finally {
      setSlugSaving(false);
    }
  };

  const copyText = useCallback(
    async (text) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(String(text));
        showAlert("success", t("settings.alerts.copied"));
      } catch (e: any) { 
        const errorMessage = validateResErrors(e, "Не удалось скопировать. Скопируйте вручную.");
        showAlert("error", errorMessage);
      }
    },
     
    []
  );

  const openUrl = useCallback((url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const scaleBarcodeModeOptions = useMemo(
    () =>
      SCALE_BARCODE_MODE_VALUES.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t],
  );

  const tabProps = {
    CafeKitchenPrintersSettings,
    CafeReceiptPrinterSettings,
    DataContainer,
    Moon,
    SCALE_BARCODE_MODE_OPTIONS: scaleBarcodeModeOptions,
    Sun,
    canEditSlug,
    canSaveSlug,
    cashierSettings,
    cashierSettingsError,
    cashierSettingsLoading,
    cashierSettingsSaving,
    code: undefined as any,
    company,
    companyState,
    copyText,
    error: undefined as any,
    errors,
    formData,
    handleCompanyChange,
    handleCreateScalesToken,
    handlePasswordInputChange,
    handleResetCompany,
    handleResetPassword,
    handleSaveCashierSettings,
    handleSaveCompany,
    handleSaveInterfaceSettings,
    handleSavePassword,
    handleSaveSlug,
    handleSlugChange,
    isBarberSector,
    isCafeSector,
    isMarketSector,
    isProductionSector,
    darkPalette,
    mode,
    onlineBookingUrl,
    onlineMenuUrl,
    openUrl,
    passwordsMismatch,
    profile,
    saving,
    setCashierSettings,
    setDarkPalette,
    setMode,
    setShowCashierDeleteCode,
    setSidebarAutoClose,
    cashierDesktopButtonEnabled,
    setCashierDesktopButtonEnabled,
    showAlert,
    showCashierDeleteCode,
    showPassword,
    sidebarAutoClose,
    slugAvailable,
    slugChanged,
    slugChecking,
    slugError,
    slugInput,
    slugSaving,
    togglePasswordVisibility,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case SETTINGS_TABS.company:
        return <CompanyTab {...tabProps} />;
      case SETTINGS_TABS.subscription:
        return <SubscriptionTab {...tabProps} />;
      case SETTINGS_TABS.security:
        return <SecurityTab {...tabProps} />;
      case SETTINGS_TABS.cashier:
        return <CashierTab {...tabProps} />;
      case SETTINGS_TABS.scalesToken:
        return <ScalesTokenTab {...tabProps} />;
      case SETTINGS_TABS.interface:
        return <InterfaceTab {...tabProps} />;
      case SETTINGS_TABS.online:
        return <OnlineTab {...tabProps} />;
      case SETTINGS_TABS.print:
        return <PrintTab {...tabProps} />;
      default:
        return null;
    }
  };

  return (
    <PageShell className="settings">
      <PageHeader
        title={t("settings.pageTitle")}
        subtitle={t("settings.pageSubtitle")}
      />

      <Tabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        company={company}
        profile={profile}
      />

      <PagePanel className="settings__panel">
        <div className="settings__content">{renderTabContent()}</div>
      </PagePanel>

      <div className="settings__footer">
        <button
          className="nur-btn nur-btn--ghost settings__logout"
          type="button"
          onClick={async () => {
            dispatch(logoutUser());
            redirectToMainAppLogin();
          }}
        >
          {t("settings.logout")}
        </button>
      </div>

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={"" as any}
        message={alertModal.message}
        onClose={closeAlert}
      onConfirm={undefined as any}
      okText={t("settings.ok")}
      />
    </PageShell>
  );
};

export default Settings;
