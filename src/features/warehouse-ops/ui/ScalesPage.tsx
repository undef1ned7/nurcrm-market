import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@shared/api";
import { sendProductsToScales } from "@entities/user";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import { PageShell, PageHeader, PagePanel } from "@shared/ui/page-shell";
import "./ScalesPage.scss";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAppDispatch } from "@app/store";

const isWeightProduct = (p) =>
  Boolean(p?.is_weight) || p?.scale_type === "weight";

/**
 * Собирает весовые товары: бэкенд фильтрует по is_weight=true
 * (см. docs/backend/scales-weight-products.md), клиентский фильтр —
 * подстраховка на случай, если параметр проигнорирован.
 */
const fetchAllWeightProducts = async () => {
  const collected: any[] = [];
  let page = 1;
  const MAX_PAGES = 100;

  while (page <= MAX_PAGES) {
    const { data } = await api.get("main/products/list/", {
      params: { page, is_weight: true },
    });
    const results = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    collected.push(...results.filter(isWeightProduct));
    if (!data?.next) break;
    page += 1;
  }

  return collected;
};

/**
 * Читает detail из blob-ответа с ошибкой (при responseType: "blob"
 * тело 400-й тоже приходит как Blob).
 */
const readBlobErrorDetail = async (err) => {
  const blob = err?.response?.data;
  if (blob instanceof Blob) {
    try {
      const { detail } = JSON.parse(await blob.text());
      if (detail) return detail;
    } catch {
      /* не JSON — падаем на общий текст */
    }
  }
  return null;
};

const TABS = (t: (key: string) => string) => [
  { id: "shtrih-m", label: t("crm.scales.tabShtrihM") },
  { id: "rongta", label: t("crm.scales.rongta") },
  { id: "settings", label: t("crm.scales.settings") },
];

const ShtrihMTab = ({
  weightProducts,
  loading,
  onSuccess,
  onError,
}: any) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [isSending, setIsSending] = useState(false);

  const count = weightProducts.length;

  const handleSendAllToScales = async () => {
    try {
      setIsSending(true);

      const payload = {
        plu_start: 1,
        product_ids: weightProducts.map((p) => p.id),
      };

      await dispatch(sendProductsToScales(payload)).unwrap();

      const productText =
        count === 1
          ? t("crm.scales.product_one")
          : count < 5
            ? t("crm.scales.product_few")
            : t("crm.scales.product_many");

      onSuccess(
        count > 0
          ? t("crm.scales.sendSuccess", { count, label: productText })
          : t("crm.scales.sendSuccessEmpty"),
      );
    } catch (err: any) {
      onError(validateResErrors(err, t("crm.scales.sendError")));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="scales-page__grid">
      <div className="scales-page__card">
        <h2 className="scales-page__card-title">{t("crm.scales.sendTitle")}</h2>
        <p className="scales-page__card-text">{t("crm.scales.sendDescription")}</p>

        <div className="scales-page__stats">
          <div className="scales-page__stat-item">
            <div className="scales-page__stat-label">
              {t("crm.scales.weightedProducts")}
            </div>
            <div className="scales-page__stat-value">{count}</div>
          </div>
        </div>

        <button
          type="button"
          className="nur-btn nur-btn--primary scales-page__send-btn"
          onClick={handleSendAllToScales}
          disabled={loading || isSending || count === 0}
        >
          {isSending ? t("crm.scales.sending") : t("crm.scales.sendToScales")}
        </button>

        {loading && (
          <div className="scales-page__hint">{t("crm.scales.loadingProducts")}</div>
        )}
        {!loading && count === 0 && (
          <div className="scales-page__hint">{t("crm.scales.noWeightProducts")}</div>
        )}
      </div>

      <div className="scales-page__info-card">
        <h3 className="scales-page__info-title">{t("crm.scales.howItWorks")}</h3>
        <ul className="scales-page__info-list">
          <li>{t("crm.scales.howItWorksShtrih1")}</li>
          <li>{t("crm.scales.howItWorksShtrih2")}</li>
          <li>{t("crm.scales.howItWorksShtrih3")}</li>
          <li>{t("crm.scales.howItWorksShtrih4")}</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Таб «Rongta»: экспорт весовых товаров под PLU-менеджер весов
 * Rongta RLS1100 (см. docs — GET /main/products/scale-export/).
 * Формат по умолчанию — .TXP (рабочий формат импорта Rongta RLS),
 * .xls — запасной.
 */
const EXPORT_FORMATS = (t: (key: string) => string) => [
  {
    id: "txp",
    label: t("crm.scales.formatTxp"),
    filename: "scale_weight_products.TXP",
  },
  {
    id: "xls",
    label: t("crm.scales.formatXls"),
    filename: "scale_weight_products.xls",
  },
];

const RongtaTab = ({ weightProducts, loading, onSuccess, onError }: any) => {
  const { t } = useTranslation();
  const exportFormats = EXPORT_FORMATS(t);
  const [isExporting, setIsExporting] = useState(false);
  const [translit, setTranslit] = useState(true);
  const [format, setFormat] = useState("txp");

  const count = weightProducts.length;

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const res = await api.get("main/products/scale-export/", {
        params: { format, translit: translit ? 1 : 0 },
        responseType: "blob",
      });

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        exportFormats.find((f) => f.id === format)?.filename ||
        exportFormats[0].filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const exportedCount = res.headers?.["x-scale-products-count"];
      onSuccess(
        exportedCount
          ? t("crm.scales.exportSuccessCount", { count: exportedCount })
          : t("crm.scales.exportSuccess"),
      );
    } catch (err: any) {
      const detail = await readBlobErrorDetail(err);
      onError(
        detail || validateResErrors(err, t("crm.scales.exportError")),
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="scales-page__grid">
      <div className="scales-page__card">
        <h2 className="scales-page__card-title">{t("crm.scales.exportTitle")}</h2>
        <p className="scales-page__card-text">{t("crm.scales.exportDescription")}</p>

        <div className="scales-page__stats">
          <div className="scales-page__stat-item">
            <div className="scales-page__stat-label">
              {t("crm.scales.weightedProducts")}
            </div>
            <div className="scales-page__stat-value">{count}</div>
          </div>
        </div>

        <div className="scales-page__field">
          <div className="scales-page__field-label">{t("crm.scales.fileFormat")}</div>
          <select
            className="nur-select scales-page__select"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            {exportFormats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <label className="scales-page__checkbox">
          <input
            type="checkbox"
            checked={translit}
            onChange={(e) => setTranslit(e.target.checked)}
          />
          {t("crm.scales.transliterateHint")}
        </label>

        <button
          type="button"
          className="nur-btn nur-btn--primary scales-page__send-btn"
          onClick={handleExport}
          disabled={loading || isExporting || count === 0}
        >
          {isExporting
            ? t("crm.scales.exporting")
            : t("crm.scales.exportBtn", {
                format: format === "xls" ? "xls" : "TXP",
              })}
        </button>

        {loading && (
          <div className="scales-page__hint">{t("crm.scales.loadingProducts")}</div>
        )}
        {!loading && count === 0 && (
          <div className="scales-page__hint">{t("crm.scales.noWeightProducts")}</div>
        )}

        <div className="scales-page__warning">
          <strong>{t("crm.scales.barcodeWarningTitle")}</strong>{" "}
          {t("crm.scales.barcodeWarning")}
        </div>
      </div>

      <div className="scales-page__info-card">
        <h3 className="scales-page__info-title">{t("crm.scales.howItWorks")}</h3>
        <ul className="scales-page__info-list">
          <li>{t("crm.scales.howItWorksRongta1")}</li>
          <li>{t("crm.scales.howItWorksRongta2")}</li>
          <li>{t("crm.scales.howItWorksRongta3")}</li>
          <li>{t("crm.scales.howItWorksRongta4")}</li>
        </ul>
      </div>
    </div>
  );
};

const BARCODE_LAYOUTS = (t: (key: string) => string) => [
  { value: "plu", label: t("crm.scales.layoutPlu") },
  { value: "code", label: t("crm.scales.layoutCode") },
];

const BARCODE_MODES = (t: (key: string) => string) => [
  { value: "auto", label: t("crm.scales.modeAuto") },
  { value: "weight", label: t("crm.scales.modeWeight") },
  { value: "amount", label: t("crm.scales.modeAmount") },
];

const ScaleBarcodeSettingsTab = ({ onSuccess, onError }: any) => {
  const { t } = useTranslation();
  const barcodeLayouts = BARCODE_LAYOUTS(t);
  const barcodeModes = BARCODE_MODES(t);
  const [layout, setLayout] = useState("plu");
  const [mode, setMode] = useState("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await api.get("users/settings/company/");
        if (cancelled) return;
        if (data?.scale_barcode_layout) setLayout(data.scale_barcode_layout);
        if (data?.scale_barcode_mode) setMode(data.scale_barcode_mode);
      } catch (err: any) {
        if (!cancelled) {
          onError(
            validateResErrors(err, t("crm.scales.settingsLoadError")),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [onError]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch("users/settings/company/", {
        scale_barcode_layout: layout,
        scale_barcode_mode: mode,
      });
      onSuccess(t("crm.scales.settingsSaved"));
    } catch (err: any) {
      onError(validateResErrors(err, t("crm.scales.settingsSaveError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scales-page__grid">
      <div className="scales-page__card">
        <h2 className="scales-page__card-title">{t("crm.scales.barcodeReading")}</h2>
        <p className="scales-page__card-text">{t("crm.scales.settingsDescription")}</p>

        <div className="scales-page__field">
          <div className="scales-page__field-label">
            {t("crm.scales.barcodeLayout")}
          </div>
          <select
            className="nur-select scales-page__select"
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            disabled={loading}
          >
            {barcodeLayouts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="scales-page__field">
          <div className="scales-page__field-label">{t("crm.scales.valueMode")}</div>
          <select
            className="nur-select scales-page__select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={loading}
          >
            {barcodeModes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="nur-btn nur-btn--primary scales-page__send-btn"
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? t("crm.scales.saving") : t("crm.scales.saveSettings")}
        </button>

        {loading && (
          <div className="scales-page__hint">{t("crm.scales.loadingSettings")}</div>
        )}

        <div className="scales-page__warning">
          <strong>{t("crm.scales.rongtaHint")}</strong>
        </div>
      </div>

      <div className="scales-page__info-card">
        <h3 className="scales-page__info-title">
          {t("crm.scales.understandLayout")}
        </h3>
        <ul className="scales-page__info-list">
          <li>{t("crm.scales.layoutHelp1")}</li>
          <li>{t("crm.scales.layoutHelp2")}</li>
          <li>{t("crm.scales.layoutHelp3")}</li>
          <li>{t("crm.scales.layoutHelp4")}</li>
          <li>{t("crm.scales.layoutHelp5")}</li>
        </ul>
        <h3 className="scales-page__info-title" style={{ marginTop: 16 }}>
          {t("crm.scales.productNotFound")}
        </h3>
        <ul className="scales-page__info-list">
          <li>{t("crm.scales.productNotFoundHint")}</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Отдельная страница для работы с весами.
 * На весы отправляются только весовые товары (is_weight / scale_type = weight).
 * Табы: «Штрих-М» — отправка на весы через бэкенд,
 * «Rongta» — экспорт файла под PLU-менеджер Rongta RLS1100,
 * «Настройки» — чтение штрихкода весов кассой (на уровне компании).
 */
const ScalesPage = () => {
  const { t } = useTranslation();
  const tabs = TABS(t);
  const [activeTab, setActiveTab] = useState("shtrih-m");
  const [weightProducts, setWeightProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const load = async () => {
      try {
        const products = await fetchAllWeightProducts();
        if (!cancelledRef.current) setWeightProducts(products);
      } catch (err: any) {
        if (!cancelledRef.current) {
          setAlertMessage(
            validateResErrors(err, t("crm.scales.loadError")),
          );
          setShowErrorAlert(true);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const handleSuccess = useCallback((message) => {
    setAlertMessage(message);
    setShowSuccessAlert(true);
  }, []);

  const handleError = useCallback((message) => {
    setAlertMessage(message);
    setShowErrorAlert(true);
  }, []);

  return (
    <PageShell className="scales-page">
      <PageHeader
        title={t("crm.scales.pageTitle")}
        subtitle={t("crm.scales.subtitle")}
      />

      <PagePanel className="scales-page__content">
        <div className="scales-page__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`scales-page__tab ${
                activeTab === tab.id ? "scales-page__tab--active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "shtrih-m" && (
          <ShtrihMTab
            weightProducts={weightProducts}
            loading={loading}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
        {activeTab === "rongta" && (
          <RongtaTab
            weightProducts={weightProducts}
            loading={loading}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
        {activeTab === "settings" && (
          <ScaleBarcodeSettingsTab
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
      </PagePanel>

      <AlertModal
        open={showSuccessAlert}
        type="success"
        title={t("crm.scales.successTitle")}
        message={alertMessage}
        okText={t("crm.scales.ok")}
        onClose={() => {
          setShowSuccessAlert(false);
          setAlertMessage("");
        }}
      />

      <AlertModal
        open={showErrorAlert}
        type="error"
        title={t("crm.scales.errorTitle")}
        message={alertMessage}
        okText={t("crm.scales.ok")}
        onClose={() => {
          setShowErrorAlert(false);
          setAlertMessage("");
        }}
      />
    </PageShell>
  );
};

export default ScalesPage;
