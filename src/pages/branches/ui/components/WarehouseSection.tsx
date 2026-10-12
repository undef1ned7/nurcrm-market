import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { FaSearch, FaWarehouse } from "react-icons/fa";
import {
  BranchSection,
  SectionState,
  ShowMore,
  money,
  qty,
  useShowMore,
} from "./BranchSection";

type WarehouseSectionProps = {
  loading: boolean;
  /** Ошибка загрузки склада — показываем её, а не «нет товаров». */
  error?: unknown;
  onRetry?: () => void;
  items: Array<{
    id: string | number;
    name?: string;
    barcode?: string;
    quantity?: number;
    remainder?: number;
    unit?: string;
    price?: number;
  }>;
};

const stockOf = (it: { quantity?: number; remainder?: number }) =>
  Number(it.quantity ?? it.remainder ?? 0) || 0;

export default function WarehouseSection({ loading, items, error, onRetry }: WarehouseSectionProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        (it.name || "").toLowerCase().includes(q) ||
        (it.barcode || "").includes(q),
    );
  }, [items, query]);

  const totalValue = useMemo(
    () => items.reduce((a, it) => a + stockOf(it) * (Number(it.price) || 0), 0),
    [items],
  );
  const outOfStock = useMemo(() => items.filter((it) => stockOf(it) <= 0).length, [items]);

  const { visible, rest, more } = useShowMore(filtered);

  return (
    <BranchSection
      title={t("crm.branches.details.warehouse.title")}
      count={loading ? null : items.length}
      actions={
        items.length > 0 && (
          <label className="bd-search">
            <FaSearch aria-hidden="true" />
            <input
              className="nur-input"
              placeholder={t("crm.branches.details.warehouse.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )
      }
    >
      {error && !loading ? (
        <div className="branch__alert branch__alert--error" role="alert">
          <p>{validateResErrors(error, t("crm.branches.details.warehouse.loadFailed"))}</p>
          {onRetry && (
            <button type="button" className="nur-btn nur-btn--secondary" onClick={onRetry}>
              {t("crm.branches.details.warehouse.retry")}
            </button>
          )}
        </div>
      ) : (
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaWarehouse />}
        emptyTitle={t("crm.branches.details.warehouse.emptyTitle")}
        emptyText={t("crm.branches.details.warehouse.emptyText")}
      >
        <div className="bd-stats">
          <div className="bd-stat">
            <span>{t("crm.branches.details.warehouse.positions")}</span>
            <b>{items.length}</b>
          </div>
          <div className="bd-stat">
            <span>{t("crm.branches.details.warehouse.retailValue")}</span>
            <b>{money(totalValue)} {t("common.currencySom")}</b>
          </div>
          <div className={`bd-stat${outOfStock ? " bd-stat--danger" : ""}`}>
            <span>{t("crm.branches.details.warehouse.outOfStock")}</span>
            <b>{outOfStock}</b>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="bd-section__hint">
            {t("crm.branches.details.states.nothingFound", { query })}
          </p>
        ) : (
          <div className="nur-table-wrap">
            <table className="nur-table bd-table">
              <thead>
                <tr>
                  <th>{t("crm.branches.details.warehouse.table.product")}</th>
                  <th className="is-num">{t("crm.branches.details.warehouse.table.stock")}</th>
                  <th className="is-num">{t("crm.branches.details.warehouse.table.price")}</th>
                  <th className="is-num">{t("crm.branches.details.warehouse.table.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const stock = stockOf(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="bd-table__title">{item.name || "—"}</div>
                        {item.barcode && (
                          <div className="bd-table__sub">{item.barcode}</div>
                        )}
                      </td>
                      <td className={`is-num${stock <= 0 ? " is-negative" : ""}`}>
                        {qty(stock)} {item.unit || t("crm.branches.details.warehouse.unitPcs")}
                      </td>
                      <td className="is-num">{money(item.price)}</td>
                      <td className="is-num">{money(stock * (Number(item.price) || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ShowMore rest={rest} onClick={more} />
      </SectionState>
      )}
    </BranchSection>
  );
}
