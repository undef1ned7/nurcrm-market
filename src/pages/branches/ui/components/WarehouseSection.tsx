import { useMemo, useState } from "react";
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

export default function WarehouseSection({ loading, items }: WarehouseSectionProps) {
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
      title="Склад"
      count={loading ? null : items.length}
      actions={
        items.length > 0 && (
          <label className="bd-search">
            <FaSearch aria-hidden="true" />
            <input
              className="nur-input"
              placeholder="Название или штрихкод"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )
      }
    >
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaWarehouse />}
        emptyTitle="На складе филиала нет товаров"
        emptyText="Привезите товары с главного склада через «Переместить товары»."
      >
        <div className="bd-stats">
          <div className="bd-stat">
            <span>Позиций</span>
            <b>{items.length}</b>
          </div>
          <div className="bd-stat">
            <span>Стоимость в рознице</span>
            <b>{money(totalValue)} сом</b>
          </div>
          <div className={`bd-stat${outOfStock ? " bd-stat--danger" : ""}`}>
            <span>Нет в наличии</span>
            <b>{outOfStock}</b>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="bd-section__hint">По запросу «{query}» ничего не найдено</p>
        ) : (
          <div className="nur-table-wrap">
            <table className="nur-table bd-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className="is-num">Остаток</th>
                  <th className="is-num">Цена, сом</th>
                  <th className="is-num">Сумма, сом</th>
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
                        {qty(stock)} {item.unit || "шт"}
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
    </BranchSection>
  );
}
