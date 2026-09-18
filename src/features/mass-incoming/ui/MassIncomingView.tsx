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
  onQty,
  onRemove,
  onCreate,
}: {
  title: string;
  rows: MassIncomingRow[];
  showStock?: boolean;
  onQty: (key: string, qty: number) => void;
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
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.name}</td>
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
                      onChange={(e) => onQty(row.key, Number(e.target.value))}
                    />
                  )}
                </td>
                <td>
                  {onCreate ? (
                    <button type="button" onClick={() => onCreate(row)}>
                      {t("crm.warehouse.massIncoming.createCard")}
                    </button>
                  ) : (
                    <button type="button" onClick={() => onRemove(row.key)}>
                      {t("common.delete")}
                    </button>
                  )}
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
            disabled={vm.saving || (vm.lists.inStock.length + vm.lists.inCatalog.length === 0)}
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
          void vm.handleBarcode(vm.barcode);
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
        <button type="submit" className="nur-btn nur-btn--primary" disabled={vm.busy}>
          {t("common.add")}
        </button>
      </form>
      {vm.error ? <p className="mass-incoming__error">{vm.error}</p> : null}

      <div className="mass-incoming__columns">
        <RowTable
          title={t("crm.warehouse.massIncoming.inStock")}
          rows={vm.lists.inStock}
          showStock
          onQty={vm.setQuantity}
          onRemove={vm.removeRow}
        />
        <RowTable
          title={t("crm.warehouse.massIncoming.inCatalog")}
          rows={vm.lists.inCatalog}
          onQty={vm.setQuantity}
          onRemove={vm.removeRow}
        />
        <RowTable
          title={t("crm.warehouse.massIncoming.unknown")}
          rows={vm.lists.unknown}
          onQty={vm.setQuantity}
          onRemove={vm.removeRow}
          onCreate={vm.openCreate}
        />
      </div>

      {vm.createFor ? (
        <div className="mass-incoming__modal" role="presentation">
          <div className="mass-incoming__dialog" role="dialog" aria-modal="true">
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
                value={vm.createPrice}
                onChange={(e) => vm.setCreatePrice(e.target.value)}
              />
            </label>
            <div className="mass-incoming__dialog-actions">
              <button type="button" className="nur-btn nur-btn--secondary" onClick={() => vm.setCreateFor(null)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="nur-btn nur-btn--primary" onClick={() => void vm.submitCreate()}>
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
