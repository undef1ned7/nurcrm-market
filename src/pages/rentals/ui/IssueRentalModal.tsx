import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import Modal from "@shared/ui/Modal/Modal";
import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import {
  fetchProductsApi,
  fetchSaleVariants,
  type ProductVariant,
} from "@entities/product";
import { VariantPickerModal, type VariantPick } from "@features/variant-picker";
import {
  buildRentalPayload,
  createRental,
  todayKey,
  validateRentalDraft,
  type RentalDraft,
} from "../api/rentals";

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

/** Выдача в прокат: клиент, вещи (с размером), срок, залог деньгами или документом. */
export default function IssueRentalModal({
  onClose,
  onCreated,
  withVariants,
}: {
  onClose: () => void;
  onCreated: () => void;
  withVariants: boolean;
}) {
  const { t } = useTranslation();
  const today = todayKey();
  const [draft, setDraft] = useState<RentalDraft>({
    clientId: "",
    items: [],
    dateFrom: today,
    dateTo: addDays(today, 1),
    depositType: "money",
    depositAmount: "",
    depositMethod: "cash",
    depositDocument: "",
    note: "",
  });
  const [clientName, setClientName] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const debouncedClient = useDebouncedValue(clientQuery, 350, undefined);
  const [clients, setClients] = useState<any[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const debouncedProduct = useDebouncedValue(productQuery, 350, undefined);
  const [products, setProducts] = useState<any[]>([]);
  const [picker, setPicker] = useState<{ product: any; variants: ProductVariant[] } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);
  const seq = useRef(0);

  const set = <K extends keyof RentalDraft>(key: K, value: RentalDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  useEffect(() => {
    const q = String(debouncedClient || "").trim();
    if (!q || draft.clientId) {
      setClients([]);
      return undefined;
    }
    let cancelled = false;
    api
      .get("/main/clients/", { params: { search: q, page_size: 10 } })
      .then(({ data }) => !cancelled && setClients(asList(data)))
      .catch(() => !cancelled && setClients([]));
    return () => {
      cancelled = true;
    };
  }, [debouncedClient, draft.clientId]);

  useEffect(() => {
    const q = String(debouncedProduct || "").trim();
    if (!q) {
      setProducts([]);
      return undefined;
    }
    let cancelled = false;
    fetchProductsApi({ search: q, page_size: 10 })
      .then((data: any) => !cancelled && setProducts(asList(data)))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, [debouncedProduct]);

  const addItem = (product: any, variant?: ProductVariant, qty = 1) => {
    const label = variant ? [variant.size, variant.color].filter(Boolean).join(", ") : "";
    seq.current += 1;
    set("items", [
      ...draft.items,
      {
        key: `r${seq.current}`,
        product: String(product.id),
        variant: variant?.id,
        name: label ? `${product.name} — ${label}` : String(product.name || "—"),
        qty: String(qty),
      },
    ]);
  };

  const pickProduct = async (product: any) => {
    setProductQuery("");
    setProducts([]);
    if (withVariants) {
      try {
        const variants = await fetchSaleVariants(product);
        if (variants.length) {
          setPicker({ product, variants });
          return;
        }
      } catch (err: any) {
        setError(validateResErrors(err, t("crm.sphere.picker.errors.loadFailed")));
        return;
      }
    }
    addItem(product);
  };

  const submit = async (e: any) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    const v = validateRentalDraft(draft);
    if (v) {
      setError(t(`crm.sphere.rentals.errors.${v}`));
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    setError("");
    try {
      await createRental(buildRentalPayload(draft));
      onCreated();
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.rentals.issueFailed")));
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={t("crm.sphere.rentals.issueTitle")}
      wrapperId="rental-issue-modal"
      className="sphere-modal"
    >
      <form onSubmit={submit} noValidate className="sphere-form">
        <label className="sphere-form__field">
          <span>{t("crm.sphere.rentals.client")}</span>
          {draft.clientId ? (
            <div className="sphere-form__chosen">
              <b>{clientName}</b>
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm"
                onClick={() => {
                  set("clientId", "");
                  setClientName("");
                }}
              >
                {t("crm.sphere.rentals.change")}
              </button>
            </div>
          ) : (
            <input
              className="nur-input"
              value={clientQuery}
              maxLength={100}
              placeholder={t("crm.sphere.rentals.clientPlaceholder")}
              onChange={(e) => setClientQuery(e.target.value)}
            />
          )}
        </label>
        {!draft.clientId && clients.length > 0 && (
          <ul className="sphere-form__results" aria-label={t("crm.sphere.rentals.client")}>
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    set("clientId", String(c.id));
                    setClientName(c.full_name || c.name || c.phone || "—");
                    setClientQuery("");
                  }}
                >
                  {c.full_name || c.name || "—"} {c.phone ? `· ${c.phone}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="sphere-form__field">
          <span>{t("crm.sphere.rentals.items")}</span>
          <input
            className="nur-input"
            value={productQuery}
            maxLength={200}
            placeholder={t("crm.sphere.rentals.productPlaceholder")}
            onChange={(e) => setProductQuery(e.target.value)}
          />
        </label>
        {products.length > 0 && (
          <ul className="sphere-form__results" aria-label={t("crm.sphere.rentals.items")}>
            {products.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => pickProduct(p)}>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {draft.items.length > 0 && (
          <ul className="sphere-form__items">
            {draft.items.map((it) => (
              <li key={it.key}>
                <span>{it.name}</span>
                <input
                  className="nur-input"
                  inputMode="numeric"
                  aria-label={t("crm.sphere.rentals.qtyFor", { name: it.name })}
                  value={it.qty}
                  onChange={(e) =>
                    set(
                      "items",
                      draft.items.map((x) => (x.key === it.key ? { ...x, qty: e.target.value } : x)),
                    )
                  }
                />
                <button
                  type="button"
                  className="nur-btn nur-btn--ghost nur-btn--sm"
                  aria-label={t("crm.sphere.rentals.removeItem", { name: it.name })}
                  onClick={() => set("items", draft.items.filter((x) => x.key !== it.key))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="sphere-form__grid">
          <label className="sphere-form__field">
            <span>{t("crm.sphere.rentals.dateFrom")}</span>
            <input
              type="date"
              className="nur-input"
              value={draft.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
            />
          </label>
          <label className="sphere-form__field">
            <span>{t("crm.sphere.rentals.dateTo")}</span>
            <input
              type="date"
              className="nur-input"
              value={draft.dateTo}
              min={draft.dateFrom}
              onChange={(e) => set("dateTo", e.target.value)}
            />
          </label>
        </div>
        <p className="sphere-form__hint">{t("crm.sphere.rentals.tariffDay")}</p>

        <fieldset className="sphere-form__row">
          <legend className="nur-label">{t("crm.sphere.rentals.deposit")}</legend>
          <label>
            <input
              type="radio"
              checked={draft.depositType === "money"}
              onChange={() => set("depositType", "money")}
            />
            {t("crm.sphere.rentals.depositMoney")}
          </label>
          <label>
            <input
              type="radio"
              checked={draft.depositType === "document"}
              onChange={() => set("depositType", "document")}
            />
            {t("crm.sphere.rentals.depositDocument")}
          </label>
        </fieldset>
        {draft.depositType === "money" ? (
          <div className="sphere-form__grid">
            <label className="sphere-form__field">
              <span>{t("crm.sphere.rentals.depositAmount")}</span>
              <input
                className="nur-input"
                inputMode="decimal"
                value={draft.depositAmount}
                onChange={(e) => set("depositAmount", e.target.value)}
              />
            </label>
            <label className="sphere-form__field">
              <span>{t("crm.sphere.rentals.depositMethod")}</span>
              <select
                className="nur-select"
                value={draft.depositMethod}
                onChange={(e) => set("depositMethod", e.target.value as "cash" | "transfer")}
              >
                <option value="cash">{t("crm.sphere.exchange.cash")}</option>
                <option value="transfer">{t("crm.sphere.exchange.transfer")}</option>
              </select>
            </label>
          </div>
        ) : (
          <label className="sphere-form__field">
            <span>{t("crm.sphere.rentals.depositDocumentLabel")}</span>
            <input
              className="nur-input"
              value={draft.depositDocument}
              maxLength={200}
              placeholder={t("crm.sphere.rentals.depositDocumentPlaceholder")}
              onChange={(e) => set("depositDocument", e.target.value)}
            />
          </label>
        )}

        <label className="sphere-form__field">
          <span>{t("crm.sphere.rentals.note")}</span>
          <textarea
            className="nur-input"
            rows={2}
            maxLength={500}
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>

        {error ? (
          <p className="sphere-form__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sphere-form__actions">
          <button type="button" className="nur-btn nur-btn--secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="nur-btn nur-btn--primary" disabled={saving}>
            {saving ? t("settings.saving") : t("crm.sphere.rentals.issueSubmit")}
          </button>
        </div>
      </form>

      {picker && (
        <VariantPickerModal
          product={picker.product}
          variants={picker.variants}
          onClose={() => setPicker(null)}
          onPick={({ variant, quantity }: VariantPick) => {
            const product = picker.product;
            setPicker(null);
            addItem(product, variant, quantity);
          }}
          confirmLabel={t("crm.sphere.rentals.addItem")}
        />
      )}
    </Modal>
  );
}
