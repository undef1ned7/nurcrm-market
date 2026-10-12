import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Search, Trash2 } from "lucide-react";
import Modal from "@shared/ui/Modal/Modal";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import {
  fetchProductsApi,
  fetchSaleVariants,
  invalidateSaleVariantsCache,
  type ProductVariant,
} from "@entities/product";
import {
  DEFAULT_EXCHANGE_TERM_SETTINGS,
  exchangeSale,
  fetchExchangeTermSettings,
  formatSaleItemName,
  getExchangeTermStatus,
  historySellProductDetail,
  saleDateOf,
  type ExchangeResult,
} from "@entities/sale";
import { VariantPickerModal, type VariantPick } from "@features/variant-picker";
import {
  buildExchangePayload,
  computeExchangeTotals,
  toExchangeReturnRow,
  validateExchange,
  type ExchangeNewLine,
} from "../lib/exchangeMath";
import "./ExchangeModal.scss";

const fmt = (n: number) =>
  (Number(n) || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

type Props = {
  sale: any;
  onClose: () => void;
  /** Обмен проведён — обновить историю. */
  onDone?: (result: ExchangeResult) => void;
  /** Показывать срок обмена 14 дней (режим «Одежда»). */
  checkTerm?: boolean;
};

/**
 * Обмен по чеку: что возвращают (не больше returnable_qty) → новый товар
 * (поиск, скан, выбор размера) → итог (доплата / сдача / без доплаты) →
 * POST /main/pos/sales/{id}/exchange/.
 */
export default function ExchangeModal({ sale, onClose, onDone, checkTerm = true }: Props) {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<ExchangeNewLine[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350, undefined);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState<{ product: any; variants: ProductVariant[] } | null>(null);
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmTerm, setConfirmTerm] = useState(false);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [termSettings, setTermSettings] = useState(DEFAULT_EXCHANGE_TERM_SETTINGS);
  const inFlightRef = useRef(false);
  const lineSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dispatch(historySellProductDetail(sale.id))
      .unwrap()
      .then((data: any) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: any) => {
        if (!cancelled) setLoadError(validateResErrors(err, t("crm.sphere.exchange.loadFailed")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, sale.id, t]);

  useEffect(() => {
    if (!checkTerm) return undefined;
    let cancelled = false;
    fetchExchangeTermSettings().then((v) => {
      if (!cancelled) setTermSettings(v);
    });
    return () => {
      cancelled = true;
    };
  }, [checkTerm]);

  // Поиск нового товара
  useEffect(() => {
    const q = String(debouncedSearch || "").trim();
    if (!q) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    fetchProductsApi({ search: q, page_size: 20 })
      .then((data: any) => {
        if (!cancelled) setResults(asList(data));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const rows = useMemo(
    () =>
      (Array.isArray(detail?.items) ? detail.items : []).map((it: any) =>
        toExchangeReturnRow(it, formatSaleItemName(it)),
      ),
    [detail],
  );
  const totals = useMemo(() => computeExchangeTotals(rows, returnQty, lines), [rows, returnQty, lines]);
  const term = useMemo(
    () => (checkTerm ? getExchangeTermStatus(saleDateOf(detail ?? sale), termSettings.daysLimit) : null),
    [checkTerm, detail, sale, termSettings.daysLimit],
  );

  const addLine = (line: Omit<ExchangeNewLine, "key">) => {
    setLines((prev) => {
      const same = prev.find(
        (l) => l.productId === line.productId && (l.variantId ?? "") === (line.variantId ?? ""),
      );
      if (same) {
        return prev.map((l) =>
          l === same ? { ...l, qty: String((Number(l.qty) || 0) + (Number(line.qty) || 0)) } : l,
        );
      }
      lineSeq.current += 1;
      return [...prev, { ...line, key: `n${lineSeq.current}` }];
    });
    setError("");
  };

  const pickProduct = async (product: any) => {
    setSearch("");
    setResults([]);
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
    addLine({
      productId: String(product.id),
      name: String(product.name || "—"),
      price: Number(product.price) || 0,
      qty: "1",
    });
  };

  const onPicked = ({ variant, quantity, price }: VariantPick) => {
    const product = picker?.product;
    setPicker(null);
    if (!product) return;
    const label = [variant.size, variant.color].filter(Boolean).join(", ");
    addLine({
      productId: String(product.id),
      variantId: variant.id,
      name: label ? `${product.name} — ${label}` : String(product.name || "—"),
      price,
      qty: String(quantity),
    });
  };

  const submit = async () => {
    if (inFlightRef.current) return;
    const v = validateExchange(rows, returnQty, lines);
    if (v) {
      setError(t(`crm.sphere.exchange.errors.${v}`));
      return;
    }
    if (term?.expired && !confirmTerm) {
      setConfirmTerm(true);
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const payload = buildExchangePayload(
        rows,
        returnQty,
        lines,
        totals.difference > 0 ? method : "cash",
      );
      const res = await exchangeSale(String(sale.id), payload);
      lines.forEach((l) => invalidateSaleVariantsCache(l.productId));
      setResult(res);
      onDone?.(res);
    } catch (err: any) {
      // 400 — текстом сервера («Обмен возможен только по оплаченному чеку»)
      setError(validateResErrors(err, t("crm.sphere.exchange.failed")));
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
      setConfirmTerm(false);
    }
  };

  const diffBlock = () => {
    if (totals.difference > 0) {
      return (
        <div className="exchange-modal__diff exchange-modal__diff--pay">
          <strong>{t("crm.sphere.exchange.toPay", { amount: fmt(totals.difference) })}</strong>
          <div className="exchange-modal__methods" role="radiogroup" aria-label={t("crm.sphere.exchange.method")}>
            <label>
              <input
                type="radio"
                name="exchange-method"
                checked={method === "cash"}
                onChange={() => setMethod("cash")}
              />
              {t("crm.sphere.exchange.cash")}
            </label>
            <label>
              <input
                type="radio"
                name="exchange-method"
                checked={method === "transfer"}
                onChange={() => setMethod("transfer")}
              />
              {t("crm.sphere.exchange.transfer")}
            </label>
          </div>
        </div>
      );
    }
    if (totals.difference < 0) {
      return (
        <div className="exchange-modal__diff exchange-modal__diff--refund">
          <strong>
            {t("crm.sphere.exchange.toRefund", { amount: fmt(Math.abs(totals.difference)) })}
          </strong>
        </div>
      );
    }
    return (
      <div className="exchange-modal__diff">
        <strong>{t("crm.sphere.exchange.noDiff")}</strong>
      </div>
    );
  };

  return (
    <Modal
      open
      onClose={submitting ? undefined : onClose}
      title={t("crm.sphere.exchange.title")}
      className="exchange-modal"
      contentClassName="exchange-modal__content"
      wrapperId="exchange-modal"
    >
      {result ? (
        <div className="exchange-modal__result" role="status">
          <p className="exchange-modal__resultTitle">
            {t("crm.sphere.exchange.done", { number: result.new_sale_number ?? "—" })}
          </p>
          <dl className="exchange-modal__resultGrid">
            <dt>{t("crm.sphere.exchange.returned")}</dt>
            <dd>{fmt(Number(result.returned_amount ?? totals.returned))} сом</dd>
            <dt>{t("crm.sphere.exchange.added")}</dt>
            <dd>{fmt(Number(result.new_amount ?? totals.added))} сом</dd>
            <dt>{t("crm.sphere.exchange.difference")}</dt>
            <dd>{fmt(Number(result.difference ?? totals.difference))} сом</dd>
          </dl>
          <p className="exchange-modal__hint">{t("crm.sphere.exchange.offsetHint")}</p>
          <div className="exchange-modal__actions">
            <button type="button" className="nur-btn nur-btn--primary" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        </div>
      ) : loading ? (
        <p>{t("crm.sphere.exchange.loading")}</p>
      ) : loadError ? (
        <div className="exchange-modal__error" role="alert">
          {loadError}
        </div>
      ) : (
        <>
          {term && (
            <div
              className={`exchange-modal__term${term.expired ? " exchange-modal__term--expired" : ""}`}
              role={term.expired ? "alert" : undefined}
            >
              {t("crm.sphere.returns.term", {
                date: term.saleDate,
                days: term.daysPassed,
                limit: term.daysLimit,
              })}
              {term.expired ? ` ${t("crm.sphere.returns.termExpired")}` : ""}
            </div>
          )}

          <section aria-labelledby="exchange-return-title">
            <h3 id="exchange-return-title" className="exchange-modal__h">
              {t("crm.sphere.exchange.step1")}
            </h3>
            <ul className="exchange-modal__rows">
              {rows.map((r) => (
                <li key={r.id} className="exchange-modal__row">
                  <span className="exchange-modal__name">{r.name}</span>
                  <span className="exchange-modal__meta">
                    {fmt(r.unitPrice)} сом · {t("crm.sphere.exchange.returnable", { qty: r.returnable })}
                  </span>
                  <input
                    className="nur-input exchange-modal__qty"
                    inputMode="decimal"
                    aria-label={t("crm.sphere.exchange.returnQty", { name: r.name })}
                    placeholder="0"
                    disabled={r.returnable <= 0}
                    value={returnQty[r.id] ?? ""}
                    onChange={(e) => {
                      setReturnQty((prev) => ({ ...prev, [r.id]: e.target.value }));
                      setError("");
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="exchange-new-title">
            <h3 id="exchange-new-title" className="exchange-modal__h">
              {t("crm.sphere.exchange.step2")}
            </h3>
            <div className="exchange-modal__search">
              <Search size={16} aria-hidden="true" />
              <input
                className="nur-input"
                value={search}
                maxLength={200}
                placeholder={t("crm.sphere.exchange.searchPlaceholder")}
                aria-label={t("crm.sphere.exchange.searchPlaceholder")}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Сканер завершает ввод Enter — берём точное совпадение штрихкода или единственный результат
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const q = search.trim();
                  const exact = results.find((p) => String(p.barcode ?? "") === q);
                  const one = exact ?? (results.length === 1 ? results[0] : null);
                  if (one) pickProduct(one);
                }}
              />
            </div>
            {searching ? <p className="exchange-modal__hint">{t("crm.sphere.exchange.searching")}</p> : null}
            {results.length > 0 && (
              <ul className="exchange-modal__results" aria-label={t("crm.sphere.exchange.results")}>
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pickProduct(p)}>
                      <span>{p.name}</span>
                      <span>{fmt(Number(p.price) || 0)} сом</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lines.length > 0 && (
              <ul className="exchange-modal__rows">
                {lines.map((l) => (
                  <li key={l.key} className="exchange-modal__row">
                    <span className="exchange-modal__name">{l.name}</span>
                    <span className="exchange-modal__meta">{fmt(l.price)} сом</span>
                    <input
                      className="nur-input exchange-modal__qty"
                      inputMode="decimal"
                      aria-label={t("crm.sphere.exchange.newQty", { name: l.name })}
                      value={l.qty}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) => (x.key === l.key ? { ...x, qty: e.target.value } : x)),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="nur-btn nur-btn--ghost nur-btn--sm"
                      aria-label={t("crm.sphere.exchange.removeLine", { name: l.name })}
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="exchange-modal__summary" aria-live="polite">
            <div>
              <span>{t("crm.sphere.exchange.returned")}</span>
              <b>{fmt(totals.returned)} сом</b>
            </div>
            <div>
              <span>{t("crm.sphere.exchange.added")}</span>
              <b>{fmt(totals.added)} сом</b>
            </div>
            {diffBlock()}
          </section>

          {confirmTerm && (
            <div className="exchange-modal__confirm" role="alertdialog" aria-label={t("crm.sphere.returns.confirmTitle")}>
              <p>{t("crm.sphere.returns.confirmExpired")}</p>
            </div>
          )}

          {error ? (
            <div className="exchange-modal__error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="exchange-modal__actions">
            <button type="button" className="nur-btn nur-btn--secondary" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </button>
            <button type="button" className="nur-btn nur-btn--primary" onClick={submit} disabled={submitting}>
              {submitting
                ? t("crm.sphere.exchange.submitting")
                : confirmTerm
                  ? t("crm.sphere.returns.confirmAnyway")
                  : t("crm.sphere.exchange.submit")}
            </button>
          </div>
        </>
      )}

      {picker && (
        <VariantPickerModal
          product={picker.product}
          variants={picker.variants}
          onClose={() => setPicker(null)}
          onPick={onPicked}
          confirmLabel={t("crm.sphere.exchange.addToExchange")}
        />
      )}
    </Modal>
  );
}
