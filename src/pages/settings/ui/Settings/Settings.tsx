import { useEffect, useState, useMemo, useCallback, useContext } from "react";
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
import { useNavigate } from "react-router-dom";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import { Sun, Moon } from "lucide-react";
import CafeReceiptPrinterSettings from "./CafeReceiptPrinterSettings";
import CafeKitchenPrintersSettings from "./CafeKitchenPrintersSettings";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { canAccessOnlineShowcase } from "@shared/lib/subscriptionPlan";
import {
  fetchMarketCashierSettings,
  normalizeMarketCashierSettings,
  updateMarketCashierSettings,
} from "@shared/api/marketCashierSettings";
import { PageShell, PageHeader, PagePanel } from "@shared/ui/page-shell";
import { CompanyTab } from "./tabs/CompanyTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { CashierTab } from "./tabs/CashierTab";
import { ScalesTokenTab } from "./tabs/ScalesTokenTab";
import { InterfaceTab } from "./tabs/InterfaceTab";
import { OnlineTab } from "./tabs/OnlineTab";
import { PrintTab } from "./tabs/PrintTab";

/* helpers */
const safeOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const SCALE_BARCODE_MODE_OPTIONS = [
  { value: "auto", label: "Авто (по префиксу)" },
  { value: "weight", label: "По весу" },
  { value: "amount", label: "По сумме" },
];

const Settings = () => {
  const dispatch = useDispatch() as any;
  const navigate = useNavigate();

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
  const initialTab = useMemo(() => {
    if (isOwner) return "Моя компания";
    if (isMarketSector) return "Токен для весов";
    if (canViewOnline) return "Онлайн";
    return "Безопасность";
  }, [isOwner, isMarketSector, canViewOnline]);

  // Инициализируем настройку сайдбара из localStorage при загрузке (только один раз)
  useEffect(() => {
    const saved = localStorage.getItem("sidebarAutoClose");
    if (saved === null) {
      localStorage.setItem("sidebarAutoClose", "false");
    }
  }, []);

  const [activeTab, setActiveTab] = useState("Безопасность");
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

    if (activeTab === "Моя компания" && !isOwner) {
      setActiveTab(
        isMarketSector
          ? "Токен для весов"
          : canViewOnline
            ? "Онлайн"
            : "Безопасность"
      );
    } else if (activeTab === "Токен для весов" && !isMarketSector) {
      setActiveTab(
        isOwner ? "Моя компания" : canViewOnline ? "Онлайн" : "Безопасность"
      );
    } else if (activeTab === "Онлайн" && !canViewOnline) {
      setActiveTab(
        isOwner
          ? "Моя компания"
          : isMarketSector
            ? "Токен для весов"
            : "Безопасность"
      );
    } else if (activeTab === "Касса" && !canViewMarketCashierSettings) {
      setActiveTab(
        isOwner
          ? "Моя компания"
          : isMarketSector
            ? "Токен для весов"
            : "Безопасность"
      );
    }
  }, [
    isMarketSector,
    isOwner,
    activeTab,
    isInitialized,
    canViewOnline,
    canViewMarketCashierSettings,
  ]);

  /* ===== Вкладка «Касса»: код удаления из корзины и максимальная скидка ===== */
  const [cashierSettings, setCashierSettings] = useState({
    deleteCode: "",
    maxDiscountPercent: "",
    debtScheduleVersion: "v2" as "v1" | "v2",
  });
  const [cashierSettingsLoading, setCashierSettingsLoading] = useState(false);
  const [cashierSettingsSaving, setCashierSettingsSaving] = useState(false);
  const [cashierSettingsError, setCashierSettingsError] = useState("");
  const [showCashierDeleteCode, setShowCashierDeleteCode] = useState(false);

  useEffect(() => {
    if (!canViewMarketCashierSettings) return undefined;
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
        });
      } catch (err: any) {
        if (cancelled) return;
        setCashierSettingsError(
          validateResErrors(err, "Не удалось загрузить настройки кассы")
        );
      } finally {
        if (!cancelled) setCashierSettingsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [canViewMarketCashierSettings]);

  const handleSaveCashierSettings = async (e) => {
    e.preventDefault();
    if (!canViewMarketCashierSettings) return;

    const code = String(cashierSettings.deleteCode || "").trim();
    if (code && !/^\d{4,8}$/.test(code)) {
      showAlert("error", "Код удаления должен состоять из 4–8 цифр");
      return;
    }

    const rawPercent = String(cashierSettings.maxDiscountPercent || "")
      .trim()
      .replace(",", ".");
    let percent: any = null;
    if (rawPercent !== "") {
      percent = parseFloat(rawPercent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        showAlert("error", "Максимальная скидка должна быть от 0 до 100 %");
        return;
      }
    }

    setCashierSettingsSaving(true);
    try {
      const data = await updateMarketCashierSettings({
        delete_item_code: code || null,
        max_discount_percent: percent === null ? null : String(percent),
        debt_schedule_version: cashierSettings.debtScheduleVersion || "v2",
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
      });
      setCashierSettingsError("");
      showAlert("success", "Настройки кассы сохранены");
    } catch (err: any) {
      showAlert(
        "error",
        validateResErrors(err, "Не удалось сохранить настройки кассы")
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
      showAlert("success", "Данные компании успешно сохранены");
    } catch (err: any) {
      const errorMessage = validateResErrors(err, "Ошибка при сохранении данных компании");
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
      showAlert("warning", "Заполните поля для изменения пароля");
      return;
    }

    if (passwordsMismatch) {
      showAlert("error", "Пароли не совпадают");
      return;
    }

    setSaving(true);
    try {
      await dispatch(updateUserData(formData)).unwrap();
      showAlert("success", "Пароль успешно изменен");
      setFormData({
        current_password: "",
        new_password: "",
        new_password2: "",
      });
    } catch (err: any) {
      const errorMessage = validateResErrors(err, "Ошибка при изменении пароля");
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
      showAlert("success", "Настройки интерфейса успешно сохранены");
    } catch (err: any) {
      const errorMessage = validateResErrors(err, "Ошибка при сохранении настроек интерфейса");
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
        showAlert("error", "Токен не найден в ответе сервера");
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
      title.textContent = "Токен для доступа к весам";

      const hint = document.createElement("p");
      hint.style.cssText = "margin:0 0 12px;color:var(--nur-muted);font-size:14px;";
      hint.textContent =
        "Скопируйте токен и сохраните его в безопасном месте:";

      const tokenBox = document.createElement("div");
      tokenBox.style.cssText =
        "background:var(--nur-surface-3);color:var(--nur-text);padding:12px;border-radius:4px;margin-bottom:16px;word-break:break-all;font-family:monospace;font-size:12px;";
      tokenBox.textContent = tokenString;

      const actions = document.createElement("div");
      actions.style.cssText =
        "display:flex;gap:8px;justify-content:flex-end;";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = "Копировать";
      copyBtn.style.cssText =
        "padding:8px 16px;background:var(--nur-info);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;";

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "Закрыть";
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
            copyBtn.textContent = "Скопировано!";
            copyBtn.style.background = "#f7d74f";
            setTimeout(() => {
              copyBtn.textContent = "Копировать";
              copyBtn.style.background = "#2563eb";
            }, 2000);
          })
          .catch(() => {
            showAlert("error", "Не удалось скопировать. Токен: " + tokenString);
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

  const { mode, setMode } = useContext(ThemeModeContext);

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
      showAlert("success", "Slug компании обновлён");
    } catch (e: any) {
      const msg = validateResErrors(e, "Не удалось сохранить slug");
      setSlugError(typeof msg === "string" ? msg : "Slug уже существует");
      showAlert("error", typeof msg === "string" ? msg : "Не удалось сохранить slug");
    } finally {
      setSlugSaving(false);
    }
  };

  const copyText = useCallback(
    async (text) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(String(text));
        showAlert("success", "Скопировано");
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

  const tabProps = {
    CafeKitchenPrintersSettings,
    CafeReceiptPrinterSettings,
    DataContainer,
    Moon,
    SCALE_BARCODE_MODE_OPTIONS,
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
    mode,
    onlineBookingUrl,
    onlineMenuUrl,
    openUrl,
    passwordsMismatch,
    profile,
    saving,
    setCashierSettings,
    setMode,
    setShowCashierDeleteCode,
    setSidebarAutoClose,
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
      case "Моя компания":
        return <CompanyTab {...tabProps} />;
      case "Безопасность":
        return <SecurityTab {...tabProps} />;
      case "Касса":
        return <CashierTab {...tabProps} />;
      case "Токен для весов":
        return <ScalesTokenTab {...tabProps} />;
      case "Интерфейс":
        return <InterfaceTab {...tabProps} />;
      case "Онлайн":
        return <OnlineTab {...tabProps} />;
      case "Печать":
        return <PrintTab {...tabProps} />;
      default:
        return null;
    }
  };

  return (
    <PageShell className="settings">
      <PageHeader
        title="Настройки"
        subtitle="Управление настройками вашей компании"
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
            navigate("/", {
              replace: true,
            });
            window.location.reload();
          }}
        >
          Выйти из аккаунта
        </button>
      </div>

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={"" as any}
        message={alertModal.message}
        onClose={closeAlert}
      onConfirm={undefined as any}
      okText="Ок"
      />
    </PageShell>
  );
};

export default Settings;
