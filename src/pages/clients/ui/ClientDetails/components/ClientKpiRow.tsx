import type { ReactNode } from "react";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoneyAmount } from "@shared/lib/i18n/format";

export interface ClientKpiItem {
  key: string;
  modifier: string;
  icon: ReactNode;
  label: string;
  value: number;
  count: number;
  onClick: () => void;
}

export interface ClientKpiRowProps {
  kpis: ClientKpiItem[];
  loading?: boolean;
}

export function ClientKpiRow({ kpis, loading = false }: ClientKpiRowProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`cdx__kpis${loading ? " cdx__kpis--loading" : ""}`}>
      {kpis.map((kpi) => (
        <button
          key={kpi.key}
          type="button"
          className={`cdx__kpi ${kpi.modifier}`}
          onClick={kpi.onClick}
        >
          <div className="cdx__kpi-top">
            <span className="cdx__kpi-icon">{kpi.icon}</span>
            <span className="cdx__kpi-label">{kpi.label}</span>
          </div>
          <div className="cdx__kpi-value">
            {formatMoneyAmount(Number(kpi.value), i18n.language)}
            <span className="cdx__kpi-cur">{t("common.currencySom")}</span>
          </div>
          <div className="cdx__kpi-foot">
            <span className="cdx__kpi-pill">
              <Layers />
              {kpi.count}
            </span>
            {t("clients.kpi.dealsCount", { count: kpi.count })}
          </div>
        </button>
      ))}
    </div>
  );
}
