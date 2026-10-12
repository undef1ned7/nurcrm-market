import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { PageShell, PageHeader, PagePanel, FilterBar } from "@shared/ui/page-shell";
import { PeriodSwitcher, NoAccess, Banner } from "@shared/ui/tools-kit";
import {
  resolvePeriod,
  type DateRange,
  type PeriodPreset,
} from "@shared/lib/period";
import { useToolsAccess } from "@entities/user";
import {
  ABC_SLICES,
  AbcSliceView,
  AbcSlicePicker,
  exportAbcCsv,
  exportAbcWord,
  getAbcSlice,
  loadAbcSlice,
  useAbcSlice,
  type AbcReportSection,
  type AbcSliceId,
} from "@features/abc-analysis";

const PRESETS: PeriodPreset[] = ["today", "week", "month", "quarter", "custom"];

/** ABC-анализ: шесть срезов, период, выгрузка отчёта в Excel и Word. */
export default function MarketAbcPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canViewAnalytics, isStartTariff } = useToolsAccess();
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [custom, setCustom] = useState<Partial<DateRange> | null>(null);
  const [sliceId, setSliceId] = useState<AbcSliceId>("productRevenue");
  const [exporting, setExporting] = useState<"csv" | "doc" | null>(null);
  const [exportError, setExportError] = useState(false);

  const period = useMemo(() => resolvePeriod(preset, custom), [preset, custom]);
  const slice = getAbcSlice(sliceId);
  const allowed = canViewAnalytics && !isStartTariff;
  const { result, loading, error, refresh } = useAbcSlice(slice, period, {
    enabled: allowed,
  });

  const runExport = async (kind: "csv" | "doc") => {
    setExporting(kind);
    setExportError(false);
    try {
      const sections: AbcReportSection[] = [];
      for (const s of ABC_SLICES) {
        sections.push({ slice: s, result: await loadAbcSlice(s, period) });
      }
      if (kind === "csv") exportAbcCsv(sections, period, t);
      else exportAbcWord(sections, period, t);
    } catch {
      setExportError(true);
    } finally {
      setExporting(null);
    }
  };

  if (!canViewAnalytics) {
    return (
      <PageShell>
        <PageHeader title={t("crm.tools.abc.pageTitle")} />
        <NoAccess
          title={t("crm.tools.noAccess.title")}
          text={t("crm.tools.noAccess.analytics")}
        />
      </PageShell>
    );
  }
  if (isStartTariff) {
    return (
      <PageShell>
        <PageHeader title={t("crm.tools.abc.pageTitle")} />
        <NoAccess
          title={t("crm.tools.noAccess.tariffTitle")}
          text={t("crm.tools.noAccess.abcTariff")}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={t("crm.tools.abc.pageTitle")}
        subtitle={t("crm.tools.abc.pageSubtitle")}
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => void refresh(true)}
              disabled={loading}
              title={t("common.refresh")}
            >
              <RefreshCw size={16} />
              <span className="nur-btn__label">{t("common.refresh")}</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => void runExport("csv")}
              disabled={exporting !== null}
              title={t("crm.tools.abc.saveExcel")}
              aria-busy={exporting === "csv"}
            >
              <FileSpreadsheet size={16} />
              <span className="nur-btn__label">
                {exporting === "csv" ? t("common.loading") : t("crm.tools.abc.saveExcel")}
              </span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => void runExport("doc")}
              disabled={exporting !== null}
              title={t("crm.tools.abc.saveWord")}
              aria-busy={exporting === "doc"}
            >
              <FileText size={16} />
              <span className="nur-btn__label">
                {exporting === "doc" ? t("common.loading") : t("crm.tools.abc.saveWord")}
              </span>
            </button>
          </>
        }
      />

      <FilterBar>
        <PeriodSwitcher
          presets={PRESETS}
          preset={preset}
          custom={custom ?? period}
          onPresetChange={(p) => {
            if (p === "custom" && !custom) setCustom(period);
            setPreset(p);
          }}
          onCustomChange={setCustom}
        />
      </FilterBar>

      {exportError && <Banner tone="danger">{t("crm.tools.abc.exportError")}</Banner>}

      <details className="abc abc__how" open>
        <summary>{t("crm.tools.abc.howTitle")}</summary>
        <div className="abc__how-grid">
          {(["A", "B", "C"] as const).map((c) => (
            <div key={c} className="abc__how-item">
              <span className={`abc__badge abc__badge--${c.toLowerCase()}`}>{c}</span>
              <span>
                <strong>{t(`crm.tools.abc.how.${c}.title`)}</strong>
                {t(`crm.tools.abc.how.${c}.text`)}
              </span>
            </div>
          ))}
        </div>
        <p className="tk-muted" style={{ margin: "0 0 12px" }}>{t("crm.tools.abc.rule")}</p>
      </details>

      <AbcSlicePicker value={sliceId} onChange={setSliceId} />

      <PagePanel
        title={t(`crm.tools.abc.slices.${slice.id}.title`)}
        description={
          slice.snapshot
            ? t("crm.tools.abc.snapshotNote")
            : t("crm.tools.abc.periodNow", {
                from: period.from.toLocaleDateString(i18n.language),
                to: period.to.toLocaleDateString(i18n.language),
              })
        }
      >
        <div className="tk-stack">
          <p className="tk-muted">{t(`crm.tools.abc.slices.${slice.id}.hint`)}</p>
          <AbcSliceView
            slice={slice}
            result={result}
            loading={loading}
            error={error}
            onRetry={() => void refresh(true)}
            onOpenProduct={(id) => navigate(`/crm/sklad/${id}`)}
          />
        </div>
      </PagePanel>
    </PageShell>
  );
}
