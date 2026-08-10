import type { ReactNode } from "react";
import { Layers } from "lucide-react";

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
}

export function ClientKpiRow({ kpis }: ClientKpiRowProps) {
  return (
    <div className="cdx__kpis">
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
            {Number(kpi.value).toFixed(2)}
            <span className="cdx__kpi-cur">сом</span>
          </div>
          <div className="cdx__kpi-foot">
            <span className="cdx__kpi-pill">
              <Layers />
              {kpi.count}
            </span>
            {kpi.count === 1 ? "сделка" : "сделок"}
          </div>
        </button>
      ))}
    </div>
  );
}
