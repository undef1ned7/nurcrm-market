import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Clock,
  FileText,
  MoreHorizontal,
  PackagePlus,
  PackageSearch,
  PackageX,
  Scale,
  Search,
  Truck,
  Undo2,
  Warehouse,
} from "lucide-react";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import { PageHeader, PageShell } from "@shared/ui/page-shell";
import { formatMoney, formatQty } from "../lib/formatReturn";
import { lineTotal } from "../lib/returnMath";
import { COMPENSATION_OPTIONS, REASON_OPTIONS } from "../model/constants";
import type { CompensationType, ReturnReason } from "../model/types";
import { useSupplierReturnForm } from "../model/useSupplierReturnForm";
import "./SupplierReturnForm.scss";

const REASON_ICONS: Record<ReturnReason, ReactNode> = {
  defect: <AlertTriangle size={15} />,
  surplus: <PackagePlus size={15} />,
  wrong_item: <Truck size={15} />,
  expired: <Clock size={15} />,
  other: <MoreHorizontal size={15} />,
};

const COMPENSATION_META: Record<
  CompensationType,
  { icon: ReactNode; short: string }
> = {
  cash: { icon: <Banknote size={18} />, short: "В кассу" },
  debt_offset: { icon: <Scale size={18} />, short: "В счёт долга" },
  none: { icon: <Warehouse size={18} />, short: "Только склад" },
};

export function SupplierReturnForm() {
  const vm = useSupplierReturnForm();
  const {
    navigate,
    suppliersLoading,
    supplierOptions,
    selectedSupplierId,
    setSelectedSupplierId,
    productsLoading,
    receiptLoading,
    receiptId,
    visibleProducts,
    search,
    setSearch,
    qtyByProductId,
    priceByProductId,
    handleQtyChange,
    handlePriceChange,
    fillMax,
    reason,
    setReason,
    comment,
    setComment,
    compensation,
    setCompensation,
    cashBoxes,
    cashboxId,
    setCashboxId,
    selectedCount,
    totalAmount,
    submitting,
    source,
    submit,
    canSubmit,
    validationError,
  } = vm;

  const selectedCompensation = COMPENSATION_OPTIONS.find(
    (option) => option.value === compensation,
  );
  const loadingCatalog = productsLoading || receiptLoading;
  const hasSupplier = Boolean(selectedSupplierId);

  return (
    <PageShell className="supplier-return-form">
      <PageHeader
        title="Возврат поставщику"
        subtitle={
          receiptId
            ? "Товары подставлены из прихода. Вернуть можно не больше остатка и не больше купленного."
            : "Спишите брак, излишек или ошибку поставки — остаток и деньги обновятся вместе."
        }
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => navigate("/crm/market/procurement?tab=returns")}
          >
            <ArrowLeft size={16} />
            К возвратам
          </button>
        }
      />

      {source === "composed" ? (
        <div className="srf__banner" role="status">
          API возвратов ещё нет. Остаток спишется через склад, деньги — через
          кассу, документ сохранится на этом устройстве.
        </div>
      ) : null}

      <div className="srf">
        <div className="srf__grid">
          <aside className="srf__aside">
            <section className="srf__card">
              <header className="srf__card-head">
                <span className="srf__step">1</span>
                <div>
                  <h2>Документ</h2>
                  <p>Поставщик и причина возврата</p>
                </div>
              </header>

              <label className="srf__field">
                <span>Поставщик</span>
                <SearchableCombobox
                  value={selectedSupplierId}
                  onChange={(value: string) =>
                    setSelectedSupplierId(String(value || ""))
                  }
                  options={supplierOptions}
                  placeholder={
                    suppliersLoading ? "Загрузка..." : "Найти поставщика"
                  }
                  classNamePrefix="searchableCombo"
                  menuPortal
                  disabled={Boolean(receiptId)}
                />
              </label>

              {receiptId ? (
                <div className="srf__receipt">
                  <FileText size={15} />
                  Возврат по приходу — позиции ограничены этой накладной
                </div>
              ) : null}

              <div className="srf__field">
                <span>Причина</span>
                <div className="srf__chips" role="radiogroup" aria-label="Причина">
                  {REASON_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`srf__chip${reason === option.value ? " is-active" : ""}`}
                      aria-pressed={reason === option.value}
                      onClick={() => setReason(option.value)}
                    >
                      {REASON_ICONS[option.value]}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="srf__field">
                <span>
                  Комментарий
                  {reason === "other" ? " *" : ""}
                </span>
                <textarea
                  className="srf__textarea"
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={
                    reason === "other"
                      ? "Опишите причину — поле обязательное"
                      : "Номер претензии, партия, что именно не так"
                  }
                />
              </label>
            </section>

            <section className="srf__card">
              <header className="srf__card-head">
                <span className="srf__step">2</span>
                <div>
                  <h2>Деньги</h2>
                  <p>Куда уйдёт сумма возврата</p>
                </div>
              </header>

              <div className="srf__money" role="radiogroup" aria-label="Компенсация">
                {COMPENSATION_OPTIONS.map((option) => {
                  const meta = COMPENSATION_META[option.value];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`srf__money-btn${
                        compensation === option.value ? " is-active" : ""
                      }`}
                      aria-pressed={compensation === option.value}
                      onClick={() => setCompensation(option.value)}
                    >
                      <span className="srf__money-icon">{meta.icon}</span>
                      <strong>{meta.short}</strong>
                    </button>
                  );
                })}
              </div>

              {selectedCompensation ? (
                <p className="srf__hint">{selectedCompensation.hint}</p>
              ) : null}

              {compensation === "cash" ? (
                <label className="srf__field">
                  <span>Касса для прихода</span>
                  <select
                    className="nur-input"
                    value={cashboxId}
                    onChange={(event) => setCashboxId(event.target.value)}
                  >
                    <option value="">Выберите кассу</option>
                    {cashBoxes.map(
                      (box: { id?: unknown; uuid?: unknown; name?: unknown }) => {
                        const id = String(box.id || box.uuid || "");
                        return (
                          <option key={id} value={id}>
                            {String(box.name || "Касса")}
                          </option>
                        );
                      },
                    )}
                  </select>
                </label>
              ) : null}

              {compensation === "debt_offset" && source === "composed" ? (
                <p className="srf__warn">
                  Пока нет API, долг не уменьшится сам — поправьте его в разделе
                  «Долги».
                </p>
              ) : null}
            </section>
          </aside>

          <section className="srf__stage">
            <header className="srf__stage-head">
              <div>
                <h2>Товары</h2>
                <p>
                  {hasSupplier
                    ? `${visibleProducts.length} позиций · выбрано ${selectedCount}`
                    : "Сначала укажите поставщика"}
                </p>
              </div>
              <label className="srf__search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Название, штрихкод, артикул"
                  disabled={!hasSupplier}
                />
              </label>
            </header>

            {!hasSupplier ? (
              <div className="srf__empty">
                <PackageSearch size={36} />
                <strong>Выберите поставщика</strong>
                <span>
                  Слева укажите, кому возвращаете товар — здесь откроется его
                  каталог с остатками.
                </span>
              </div>
            ) : loadingCatalog ? (
              <div className="srf__empty">
                <span className="srf__spinner" aria-hidden />
                <strong>Загружаем товары</strong>
                <span>Собираем остатки и лимиты по приходу…</span>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="srf__empty">
                <PackageX size={36} />
                <strong>Нечего возвращать</strong>
                <span>
                  {receiptId
                    ? "В этом приходе не осталось возвратных позиций или на складе нулевой остаток."
                    : search
                      ? "По запросу ничего не найдено."
                      : "У поставщика нет товаров с остатком."}
                </span>
              </div>
            ) : (
              <div className="srf__table-wrap">
                <table className="srf__table">
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>На складе</th>
                      {receiptId ? <th>Куплено / вернули</th> : null}
                      <th>Можно</th>
                      <th>Цена</th>
                      <th>Кол-во</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((product) => {
                      const qty = Number(
                        String(qtyByProductId[product.productId] || "").replace(
                          ",",
                          ".",
                        ),
                      );
                      const selected = Number.isFinite(qty) && qty > 0;
                      const price = Number(
                        String(
                          priceByProductId[product.productId] ??
                            product.purchasePrice,
                        ).replace(",", "."),
                      );
                      const sum = selected
                        ? lineTotal(qty, Number.isFinite(price) ? price : 0)
                        : 0;
                      return (
                        <tr
                          key={product.productId}
                          className={selected ? "is-selected" : undefined}
                        >
                          <td>
                            <div className="srf__product">
                              <strong>{product.productName}</strong>
                              <span>
                                {[product.barcode, product.article, product.code]
                                  .filter(Boolean)
                                  .join(" · ") || product.unit}
                              </span>
                            </div>
                          </td>
                          <td>
                            {formatQty(product.currentStock)}{" "}
                            <small>{product.unit}</small>
                          </td>
                          {receiptId ? (
                            <td>
                              {formatQty(product.purchasedQty ?? 0)}
                              <small> / {formatQty(product.alreadyReturnedQty)}</small>
                            </td>
                          ) : null}
                          <td>
                            <span className="srf__returnable">
                              {formatQty(product.returnableQty)}
                            </span>
                          </td>
                          <td>
                            <input
                              className="srf__num"
                              inputMode="decimal"
                              value={priceByProductId[product.productId] ?? ""}
                              onChange={(event) =>
                                handlePriceChange(
                                  product.productId,
                                  event.target.value,
                                )
                              }
                              aria-label={`Цена ${product.productName}`}
                            />
                          </td>
                          <td>
                            <div className="srf__qty">
                              <input
                                className="srf__num"
                                inputMode="decimal"
                                value={qtyByProductId[product.productId] ?? ""}
                                onChange={(event) =>
                                  handleQtyChange(
                                    product.productId,
                                    event.target.value,
                                    product.isWeight,
                                  )
                                }
                                placeholder="0"
                                disabled={product.returnableQty <= 0}
                                aria-label={`Количество ${product.productName}`}
                              />
                              <button
                                type="button"
                                onClick={() => fillMax(product)}
                                disabled={product.returnableQty <= 0}
                              >
                                всё
                              </button>
                            </div>
                          </td>
                          <td className="srf__sum">
                            {selected ? formatMoney(sum) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="srf__dock">
          <div className="srf__dock-stats">
            <div>
              <span>Позиций</span>
              <strong>{selectedCount}</strong>
            </div>
            <div>
              <span>Сумма возврата</span>
              <strong>{formatMoney(totalAmount)}</strong>
            </div>
          </div>
          <div className="srf__dock-action">
            {validationError && selectedCount > 0 ? (
              <p className="srf__dock-error">{validationError}</p>
            ) : (
              <p className="srf__dock-hint">
                Проверьте количество и нажмите оформить — остаток спишется сразу.
              </p>
            )}
            <button
              type="button"
              className="nur-btn nur-btn--primary srf__submit"
              onClick={submit}
              disabled={!canSubmit}
            >
              <Undo2 size={18} />
              {submitting ? "Сохранение..." : "Оформить возврат"}
            </button>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
