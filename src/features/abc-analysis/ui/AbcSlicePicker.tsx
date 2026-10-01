import "./abc.scss";
import { useTranslation } from "react-i18next";
import { DollarSign, LayoutGrid, ShoppingBasket, Tag, TrendingUp, Warehouse } from "lucide-react";
import { ABC_SLICES, type AbcSliceId } from "../model/slices";

const ICONS = {
  productRevenue: DollarSign,
  productProfit: TrendingUp,
  productQty: ShoppingBasket,
  category: LayoutGrid,
  brand: Tag,
  stock: Warehouse,
} as const;

/** Выбор среза карточками: название + простой вопрос, на который срез отвечает. */
export function AbcSlicePicker({
  value,
  onChange,
}: {
  value: AbcSliceId;
  onChange: (id: AbcSliceId) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="abc abc__picker" role="radiogroup" aria-label={t("crm.tools.abc.sliceLabel")}>
      {ABC_SLICES.map((s) => {
        const Icon = ICONS[s.id];
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={value === s.id}
            className={`abc__pick${value === s.id ? " is-active" : ""}`}
            onClick={() => onChange(s.id)}
          >
            <span className="abc__pick-icon"><Icon size={18} /></span>
            <span>
              <span className="abc__pick-title">{t(`crm.tools.abc.slices.${s.id}.tab`)}</span>
              <span className="abc__pick-q">{t(`crm.tools.abc.slices.${s.id}.question`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
