import { useEffect } from "react";
import { ScanBarcode, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMassIncoming } from "../model/useMassIncoming";
import type { MassIncomingRow } from "../model/types";
import "./MassIncomingView.scss";

type Props = {
  onClose: () => void;
  onSaved?: () => void;
};

function RowTable({
  title,
  rows,
  showStock,
  showPrice,
  disabled,
  onQty,
  onPrice,
  isPriceMissing,
  onRemove,
  onCreate,
}: {
  title: string;
  rows: MassIncomingRow[];
  showStock?: boolean;
  showPrice?: boolean;
  disabled?: boolean;
  onQty: (key: string, qty: number) => void;
  onPrice?: (key: string, price: string) => void;
  isPriceMissing?: (row: MassIncomingRow) => boolean;
  onRemove: (key: string) => void;
  onCreate?: (row: MassIncomingRow) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="mass-incoming__list">
      <header>
        <h2>{title}</h2>
        <span>{rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <p className="mass-incoming__empty">{t("crm.warehouse.massIncoming.empty")}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("crm.warehouse.massIncoming.barcode")}</th>
              {showStock ? <th>{t("crm.warehouse.massIncoming.stock")}</th> : null}
              <th>{t("common.quantity")}</th>
              {showPrice ? <th>{t("crm.warehouse.massIncoming.salePrice")}</th> : null}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  {row.name}
                  {row.source === "global" ? (
                    <small className="mass-incoming__source">
                      {t("crm.warehouse.massIncoming.fromGlobal")}
                    </small>
                  ) : null}
                </td>
                <td>{row.barcode}</td>
                {showStock ? <td>{row.stockQty ?? "—"}</td> : null}
                <td>
                  {row.status === "UNKNOWN" ? (
                    "—"
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={row.quantity}
                      disabled={disabled}
                      onChange={(e) => onQty(row.key, Number(e.target.value))}
                    />
                  )}
                </td>
                {showPrice ? (
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={row.price}
                      disabled={disabled}
                      placeholder={
                        row.source === "global"
                          ? t("crm.warehouse.massIncoming.priceRequired")
                          : "—"
                      }
                      aria-invalid={isPriceMissing?.(row) || undefined}
                      className={isPriceMissing?.(row) ? "is-invalid" : undefined}
                      onChange={(e) => onPrice?.(row.key, e.target.value)}
                    />
                  </td>
                ) : null}
                <td>
                  {onCreate ? (
                    <button type="button" disabled={disabled} onClick={() => onCreate(row)}>
                      {t("crm.warehouse.massIncoming.createCard")}
                    </button>
                  ) : null}
                  {/* «Удалить» есть у всех строк, в т.ч. у неизвестного штрихкода:
                      ошибочно отсканированный код раньше было не убрать из списка */}
                  <button type="button" disabled={disabled} onClick={() => onRemove(row.key)}>
                    {t("common.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function MassIncomingView({ onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const vm = useMassIncoming();

  useEffect(() => {
    if (!vm.dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [vm.dirty]);

  const requestClose = () => {
    if (
      vm.dirty &&
      !window.confirm(t("crm.warehouse.massIncoming.confirmCloseUnsaved"))
    ) {
      vm.focusInput();
      return;
    }
    onClose();
  };

  return (
    <div className="mass-incoming">
      <header className="mass-incoming__top">
        <div>
          <h1>
            <ScanBarcode size={22} /> {t("crm.warehouse.massScan")}
          </h1>
          <p>{t("crm.warehouse.massIncoming.scanHint")}</p>
        </div>
        <div className="mass-incoming__actions">
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            disabled={
              vm.saving ||
              vm.pending > 0 ||
              vm.lists.inStock.length + vm.lists.inCatalog.length === 0
            }
            onClick={async () => {
              const ok = await vm.save();
              if (ok) onSaved?.();
            }}
          >
            {vm.saving
              ? t("crm.warehouse.massIncoming.saving")
              : t("crm.warehouse.massIncoming.submit")}
          </button>
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={requestClose}
          >
            <X size={16} /> {t("common.close")}
          </button>
        </div>
      </header>

      <form
        className="mass-incoming__scan"
        onSubmit={(e) => {
          e.preventDefault();
          vm.handleBarcode(vm.barcode);
        }}
      >
        <input
          ref={vm.inputRef}
          value={vm.barcode}
          onChange={(e) => vm.setBarcode(e.target.value)}
          placeholder={t("crm.warehouse.massIncoming.scanPlaceholder")}
          autoComplete="off"
          autoFocus
        />
        <button type="submit" className="nur-btn nur-btn--primary" disabled={vm.saving}>
          {t("common.add")}
        </button>
      </form>
      {vm.pending > 0 ? (
        <p className="mass-incoming__pending">
          {t("crm.warehouse.massIncoming.checking", { count: vm.pending })}
        </p>
      ) : null}
      {vm.error ? <p className="mass-incoming__error">{vm.error}</p> : null}

      <div className="mass-incoming__columns">
        <RowTable
          title={t("crm.warehouse.massIncoming.inStock")}
          rows={vm.lists.inStock}
          showStock
          disabled={vm.saving}
          onQty={vm.setQuantity}
          onRemove={vm.removeRow}
        />
        <RowTable
          title={t("crm.warehouse.massIncoming.inCatalog")}
          rows={vm.lists.inCatalog}
          showPrice
          disabled={vm.saving}
          onQty={vm.setQuantity}
          onPrice={vm.setPrice}
          isPriceMissing={(row) => vm.showPriceErrors && vm.priceMissing(row)}
          onRemove={vm.removeRow}
        />
        <RowTable
          title={t("crm.warehouse.massIncoming.unknown")}
          rows={vm.lists.unknown}
          disabled={vm.saving}
          onQty={vm.setQuantity}
          onRemove={vm.removeRow}
          onCreate={vm.openCreate}
        />
      </div>

      {vm.createFor ? (
        <div className="mass-incoming__modal" role="presentation">
          <form
            className="mass-incoming__dialog"
            role="dialog"
            aria-modal="true"
            onSubmit={(e) => {
              e.preventDefault();
              void vm.submitCreate();
            }}
          >
            <h3>{t("crm.warehouse.massIncoming.createCard")}</h3>
            <label>
              {t("crm.warehouse.massIncoming.barcode")}
              <input value={vm.createFor.barcode} readOnly />
            </label>
            <label>
              {t("common.name")}
              <input
                value={vm.createName}
                onChange={(e) => vm.setCreateName(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              {t("crm.warehouse.massIncoming.priceOptional")}
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={vm.createPrice}
                onChange={(e) => vm.setCreatePrice(e.target.value)}
              />
            </label>
            {vm.createError ? (
              <p className="mass-incoming__error">{vm.createError}</p>
            ) : null}
            <div className="mass-incoming__dialog-actions">
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={vm.closeCreate}
                disabled={vm.creating}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" className="nur-btn nur-btn--primary" disabled={vm.creating}>
                {vm.creating ? t("crm.warehouse.massIncoming.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
