import { Package, RefreshCw } from "lucide-react";

import type { SupplierProduct } from "../clientDetails.types";

export interface SupplierProductsSectionProps {
  clientId?: string | number | null;
  supplierProductSearch: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  supplierProductsLoading: boolean;
  supplierProductsErr?: string | null;
  supplierProductsLength: number;
  filteredSupplierProducts: SupplierProduct[];
  supplierProductsCountLabel: string | number;
}

export function SupplierProductsSection({
  clientId,
  supplierProductSearch,
  onSearchChange,
  onRefresh,
  supplierProductsLoading,
  supplierProductsErr,
  supplierProductsLength,
  filteredSupplierProducts,
  supplierProductsCountLabel,
}: SupplierProductsSectionProps) {
  return (
    <div className="cdx__card">
      <div className="cdx__supplier-head">
        <div>
          <h3 className="cdx__card-title">
            <Package /> Товары поставщика
          </h3>
          <div className="cdx__supplier-subtitle">
            Список товаров, которые этот поставщик привозит
          </div>
        </div>

        <div className="cdx__supplier-actions">
          <input
            type="text"
            className="cdx__input"
            placeholder="Поиск по названию, коду, артикулу, штрихкоду"
            value={supplierProductSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onRefresh}
            disabled={!clientId || supplierProductsLoading}
          >
            <RefreshCw />
            {supplierProductsLoading ? "Обновляем..." : "Обновить товары"}
          </button>
        </div>
      </div>

      <div className="cdx__supplier-summary">
        <div className="cdx__supplier-chip">
          Всего товаров: <b>{supplierProductsLength}</b>
        </div>
        <div className="cdx__supplier-chip">
          Показано: <b>{supplierProductsCountLabel}</b>
        </div>
      </div>

      {supplierProductsErr && (
        <div style={{ padding: "16px 22px 0" }}>
          <div className="cdx__alert">{supplierProductsErr}</div>
        </div>
      )}

      {supplierProductsLoading ? (
        <div className="cdx__state">Загрузка…</div>
      ) : filteredSupplierProducts.length === 0 ? (
        <div className="cdx__state">
          {supplierProductSearch.trim()
            ? "По вашему запросу товары не найдены"
            : "У этого поставщика пока нет товаров"}
        </div>
      ) : (
        <>
          <div className="cdx__supplier-table-wrap">
            <table className="cdx__supplier-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Код</th>
                  <th>Артикул</th>
                  <th>Штрихкод</th>
                  <th>Остаток</th>
                  <th>Ед. изм.</th>
                  <th>Закупочная цена</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplierProducts.map((product) => (
                  <tr key={product?.id || product?.code || product?.barcode}>
                    <td>
                      {product?.name || product?.title || "Без названия"}
                    </td>
                    <td>{product?.code || "—"}</td>
                    <td>{product?.article || "—"}</td>
                    <td>{product?.barcode || "—"}</td>
                    <td>{product?.quantity ?? 0}</td>
                    <td>{product?.unit || "—"}</td>
                    <td>
                      {product?.purchase_price ?? product?.price ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cdx__supplier-cards">
            {filteredSupplierProducts.map((product) => (
              <div
                key={`card-${product?.id || product?.code || product?.barcode}`}
                className="cdx__supplier-card"
              >
                <div className="cdx__supplier-card-name">
                  {product?.name || product?.title || "Без названия"}
                </div>
                <div className="cdx__supplier-card-row">
                  <span>Код</span>
                  <strong>{product?.code || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>Артикул</span>
                  <strong>{product?.article || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>Штрихкод</span>
                  <strong>{product?.barcode || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>Остаток</span>
                  <strong>{product?.quantity ?? 0}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>Ед. изм.</span>
                  <strong>{product?.unit || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>Закупочная цена</span>
                  <strong>
                    {product?.purchase_price ?? product?.price ?? "—"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
