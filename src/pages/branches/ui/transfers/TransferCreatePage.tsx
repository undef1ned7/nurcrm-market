import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBarcode,
  FaExchangeAlt,
  FaMinus,
  FaPlus,
  FaTimes,
  FaTrash,
  FaWarehouse,
  FaStore,
} from "react-icons/fa";
import { PageShell, PageHeader, PagePanel, EmptyState } from "@shared/ui/page-shell";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  createTransfer,
  fetchBranchesAsync,
  fetchTransfer,
  searchStockProducts,
  type TransferProduct,
} from "@entities/branch";
import { downloadTransferPdf } from "./transferPdf";
import {
  fmtMoney,
  fmtQty,
  mainWarehouseLabel,
  parseQty,
  placeToApi,
  placeToStockParam,
  todayIso,
} from "./transfers.utils";
import "../Branch.scss";
import "./BranchTransfers.scss";

type Line = { product: TransferProduct; quantity: string };

const lineError = (l: Line, t: TFunction): string => {
  const qty = parseQty(l.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return t("crm.branches.transfers.validation.qtyRequired");
  if (!l.product.is_weight && !Number.isInteger(qty)) return t("crm.branches.transfers.validation.integerOnly");
  if (l.product.quantity != null && qty > l.product.quantity) {
    return t("crm.branches.transfers.validation.available", { qty: fmtQty(l.product.quantity) });
  }
  return "";
};

const unitCost = (p: TransferProduct) => p.purchase_price ?? p.price ?? 0;

const TransferCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const alert = useAlert();
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const {
    list: branches,
    loading: branchesLoading,
    error: branchesError,
  } = useSelector((state: any) => state.branches);

  const [from, setFrom] = useState(params.get("from") || "");
  const [to, setTo] = useState(params.get("to") || "");
  const [date, setDate] = useState(todayIso());
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<TransferProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [repeatNote, setRepeatNote] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (!branches.length) dispatch(fetchBranchesAsync(undefined as any));
  }, [branches.length, dispatch]);

  const places = useMemo(
    () => [
      { value: "", label: mainWarehouseLabel(), active: true },
      ...branches.map((b: any) => ({
        value: String(b.id),
        label: b.name || t("crm.branches.transfers.create.noName"),
        active: b.is_active !== false,
      })),
    ],
    [branches, t],
  );
  // «Куда» по умолчанию — первый активный филиал, чтобы форма не открывалась
  // с ошибкой «Главный склад → Главный склад».
  useEffect(() => {
    if (params.get("to") || params.get("repeat") || to !== from) return;
    const target = places.find((p) => p.value && p.value !== from && p.active);
    if (target) setTo(target.value);
  }, [places, from, to, params]);

  const placeLabel = (v: string) =>
    places.find((p) => p.value === v)?.label || mainWarehouseLabel();

  // «Повторить перемещение»: маршрут и позиции из старого документа.
  // Текущий остаток неизвестен — его проверит сервер при проведении.
  useEffect(() => {
    const repeatId = params.get("repeat");
    if (!repeatId) return;
    fetchTransfer(repeatId)
      .then((tr) => {
        setFrom(tr.from_branch?.id ? String(tr.from_branch.id) : "");
        setTo(tr.to_branch?.id ? String(tr.to_branch.id) : "");
        setComment(tr.comment || "");
        setLines(
          (tr.items || []).map((it) => ({
            product: {
              id: String(it.product),
              name: it.name,
              article: it.article,
              barcode: it.barcode,
              unit: it.unit,
              quantity: null,
              purchase_price: it.price != null ? Number(it.price) : null,
            },
            quantity: String(Number(it.quantity) || 1),
          })),
        );
        setRepeatNote(t("crm.branches.transfers.create.repeatCopied", { number: tr.number }));
      })
      .catch(() => setRepeatNote(t("crm.branches.transfers.create.repeatLoadFailed")));
    // Только при открытии страницы.
  }, []);

  useEffect(() => {
    const id = ++reqId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await searchStockProducts(placeToStockParam(from), query.trim());
        if (id === reqId.current) {
          setFound(rows);
          setSearchFailed(false);
        }
      } catch {
        if (id === reqId.current) {
          setFound([]);
          setSearchFailed(true);
        }
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [from, query, reloadKey]);

  // Предупреждение при закрытии вкладки с незаполненным документом.
  useEffect(() => {
    if (!lines.length) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [lines.length]);

  const withLinesGuard = (message: string, action: () => void) => {
    if (!lines.length) return action();
    confirm(message, (ok: boolean) => ok && action());
  };

  const changeFrom = (value: string) => {
    if (value === from) return;
    withLinesGuard(
      t("crm.branches.transfers.create.confirmChangeFrom"),
      () => {
        setFrom(value);
        setLines([]);
        setRepeatNote("");
        if (value === to) setTo(from);
      },
    );
  };

  const swap = () =>
    withLinesGuard(
      t("crm.branches.transfers.create.confirmSwap"),
      () => {
        setFrom(to);
        setTo(from);
        setLines([]);
        setRepeatNote("");
      },
    );

  const addProduct = (p: TransferProduct) => {
    if (p.quantity != null && p.quantity <= 0) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (!existing) return [{ product: p, quantity: "1" }, ...prev];
      const next = parseQty(existing.quantity) + 1;
      const capped = p.quantity != null ? Math.min(next, p.quantity) : next;
      return prev.map((l) =>
        l.product.id === p.id ? { ...l, quantity: String(capped) } : l,
      );
    });
    setFormError("");
  };

  // Enter в поиске: сканер штрихкода или точный артикул → сразу в документ.
  const onSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = query.trim();
    if (!code) return;
    try {
      const rows = await searchStockProducts(placeToStockParam(from), code);
      const exact =
        rows.find((r) => r.barcode === code || r.article === code) ||
        (rows.length === 1 ? rows[0] : null);
      if (!exact) {
        setFound(rows);
        setFormError(t("crm.branches.transfers.create.productNotFound", { code, place: placeLabel(from) }));
        return;
      }
      if (exact.quantity != null && exact.quantity <= 0) {
        setFormError(t("crm.branches.transfers.create.noStock", { name: exact.name }));
        return;
      }
      addProduct(exact);
      setQuery("");
    } catch {
      setFormError(t("crm.branches.transfers.create.searchFailed"));
    }
  };

  const setQty = (id: string, quantity: string) =>
    setLines((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, quantity } : l)),
    );

  const step = (l: Line, delta: number) => {
    const current = parseQty(l.quantity);
    const base = Number.isFinite(current) ? current : 0;
    let next = Math.max(0, base + delta);
    if (l.product.quantity != null) next = Math.min(next, l.product.quantity);
    setQty(l.product.id, String(+next.toFixed(3)));
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.product.id !== id));

  const totals = useMemo(() => {
    let qty = 0;
    let sum = 0;
    for (const l of lines) {
      const q = parseQty(l.quantity);
      if (!Number.isFinite(q) || q <= 0) continue;
      qty += q;
      sum += q * unitCost(l.product);
    }
    return { qty, sum };
  }, [lines]);

  const invalidLines = lines.filter((l) => lineError(l, t)).length;
  const routeError =
    from === to ? t("crm.branches.transfers.validation.sameRoute") : "";
  const toInactive = to && places.find((p) => p.value === to)?.active === false;
  // Филиал из ссылки (?to= / ?from=) должен быть в списке: иначе в итоге было
  // «Главный склад → Главный склад», а POST уходил с несуществующим UUID
  const isKnownPlace = (v: string) => !v || places.some((p) => p.value === v);
  const unknownPlace =
    branchesLoading || !branches.length
      ? t("crm.branches.transfers.validation.branchesLoading")
      : !isKnownPlace(to)
        ? t("crm.branches.transfers.validation.toNotFound")
        : !isKnownPlace(from)
          ? t("crm.branches.transfers.validation.fromNotFound")
          : "";
  const blocker =
    unknownPlace ||
    routeError ||
    (toInactive ? t("crm.branches.transfers.validation.toInactive") : "") ||
    (!date ? t("crm.branches.transfers.validation.dateRequired") : "") ||
    (!lines.length ? t("crm.branches.transfers.validation.noLines") : "") ||
    (invalidLines ? t("crm.branches.transfers.validation.fixLines", { n: invalidLines }) : "");

  const submit = () => {
    if (saving) return;
    if (blocker) {
      setFormError(blocker);
      return;
    }
    confirm(
      t("crm.branches.transfers.create.confirmSubmit", {
        from: placeLabel(from),
        to: placeLabel(to),
        n: lines.length,
        qty: fmtQty(totals.qty),
      }),
      async (ok: boolean) => {
        if (!ok) return;
        setSaving(true);
        setFormError("");
        try {
          const created = await createTransfer({
            from_branch: placeToApi(from),
            to_branch: placeToApi(to),
            date,
            comment: comment.trim() || undefined,
            items: lines.map((l) => ({
              product: l.product.id,
              quantity: parseQty(l.quantity),
            })),
          });
          setLines([]);
          try {
            await downloadTransferPdf(created);
          } catch {
            alert(
              t("crm.branches.transfers.create.pdfFailedAfterSubmit"),
              true,
            );
          }
          navigate(`/crm/branch/transfers?open=${created.id}`, { replace: true });
        } catch (err: any) {
          setFormError(
            validateResErrors(
              err?.response?.data || err,
              t("crm.branches.transfers.create.submitFailed"),
            ),
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const PlaceIcon = ({ value }: { value: string }) =>
    value ? <FaStore /> : <FaWarehouse />;

  return (
    <PageShell className="branch transfers transfer-create">
      <PageHeader
        title={t("crm.branches.transfers.common.newTransfer")}
        subtitle={t("crm.branches.transfers.common.subtitle")}
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--ghost"
            onClick={() =>
              withLinesGuard(t("crm.branches.transfers.create.confirmLeave"), () =>
                navigate("/crm/branch/transfers"),
              )
            }
          >
            <FaArrowLeft /> {t("crm.branches.transfers.create.backToHistory")}
          </button>
        }
      />

      <section className="transfer-route" aria-label={t("crm.branches.transfers.create.routeAria")}>
        <label className="transfer-route__card">
          <span className="transfer-route__icon transfer-route__icon--from">
            <PlaceIcon value={from} />
          </span>
          <span className="transfer-route__text">
            <span className="transfer-route__caption">{t("crm.branches.transfers.common.from")}</span>
            <select
              className="transfer-route__select"
              value={from}
              onChange={(e) => changeFrom(e.target.value)}
            >
              {places.map((p) => (
                <option key={p.value || "main"} value={p.value}>
                  {p.label}
                  {p.active ? "" : t("crm.branches.transfers.create.inactiveSuffix")}
                </option>
              ))}
            </select>
          </span>
        </label>

        <button
          type="button"
          className="transfer-route__swap"
          onClick={swap}
          title={t("crm.branches.transfers.create.swap")}
          aria-label={t("crm.branches.transfers.create.swap")}
        >
          <FaExchangeAlt />
        </button>

        <label className={`transfer-route__card${routeError ? " has-error" : ""}`}>
          <span className="transfer-route__icon transfer-route__icon--to">
            <PlaceIcon value={to} />
          </span>
          <span className="transfer-route__text">
            <span className="transfer-route__caption">{t("crm.branches.transfers.common.to")}</span>
            <select
              className="transfer-route__select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {places.map((p) => (
                <option
                  key={p.value || "main"}
                  value={p.value}
                  disabled={p.value === from || !p.active}
                >
                  {p.label}
                  {p.active ? "" : t("crm.branches.transfers.create.inactiveSuffix")}
                </option>
              ))}
            </select>
            {routeError && <span className="transfer-route__error">{routeError}</span>}
          </span>
        </label>

        <label className="transfer-route__card transfer-route__card--date">
          <span className="transfer-route__text">
            <span className="transfer-route__caption">{t("crm.branches.transfers.create.docDate")}</span>
            <input
              type="date"
              className="transfer-route__select"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
            />
          </span>
        </label>
      </section>

      {!branchesLoading && branchesError && branches.length === 0 ? (
        // Сбой загрузки — не «Нет филиалов» (раньше выглядело так, будто их не создали)
        <PagePanel>
          <div className="branch__alert branch__alert--error" role="alert">
            <p>{validateResErrors(branchesError, t("crm.branches.transfers.create.branchesLoadFailed"))}</p>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => dispatch(fetchBranchesAsync(undefined as any))}
            >
              {t("crm.branches.transfers.common.retry")}
            </button>
          </div>
        </PagePanel>
      ) : !branchesLoading && branches.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={<FaStore />}
            title={t("crm.branches.transfers.create.noBranchesTitle")}
            text={t("crm.branches.transfers.create.noBranchesText")}
            action={
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={() => navigate("/crm/branch")}
              >
                <FaPlus /> {t("crm.branches.transfers.common.backToBranches")}
              </button>
            }
          />
        </PagePanel>
      ) : (
      <div className="transfer-create__grid">
        <PagePanel
          title={t("crm.branches.transfers.create.pickerTitle")}
          description={placeLabel(from)}
          className="transfer-create__picker"
        >
          <div className="branch__search">
            <FaBarcode className="branch__search-icon" />
            <input
              ref={searchRef}
              autoFocus
              className="nur-input branch__search-input"
              placeholder={t("crm.branches.transfers.create.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            {query && (
              <button
                type="button"
                className="transfer-create__clear"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                aria-label={t("crm.branches.transfers.create.clearSearch")}
              >
                <FaTimes />
              </button>
            )}
          </div>

          <ul className="transfer-form__found">
            {searching && found.length === 0 && (
              <li className="transfer-form__hint">{t("crm.branches.transfers.create.productsLoading")}</li>
            )}
            {!searching && searchFailed && (
              <li className="transfer-form__hint transfer-form__hint--error">
                {t("crm.branches.transfers.create.productsLoadFailed")}{" "}
                <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
                  {t("crm.branches.transfers.common.retry")}
                </button>
              </li>
            )}
            {!searching && !searchFailed && found.length === 0 && (
              <li className="transfer-form__hint">
                {query
                  ? t("crm.branches.transfers.create.nothingFound", { query })
                  : t("crm.branches.transfers.create.noProducts")}
              </li>
            )}
            {found.map((p) => {
              const inDoc = lines.find((l) => l.product.id === p.id);
              const empty = p.quantity != null && p.quantity <= 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`transfer-form__found-item${inDoc ? " is-added" : ""}`}
                    disabled={empty}
                    onClick={() => {
                      addProduct(p);
                      searchRef.current?.focus();
                    }}
                  >
                    <span className="transfer-form__found-name">
                      {p.name}
                      <small>{p.barcode || p.article || ""}</small>
                    </span>
                    <span className="transfer-form__found-meta">
                      {empty
                        ? t("crm.branches.transfers.create.outOfStock")
                        : `${fmtQty(p.quantity)} ${p.unit || t("crm.branches.transfers.common.pcs")}`}
                    </span>
                    {inDoc ? (
                      <span className="transfer-form__badge">
                        {fmtQty(inDoc.quantity)}
                      </span>
                    ) : (
                      !empty && <FaPlus />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </PagePanel>

        <PagePanel
          title={`${t("crm.branches.transfers.create.linesTitle")}${lines.length ? ` · ${lines.length}` : ""}`}
          className="transfer-create__lines"
          actions={
            lines.length ? (
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm"
                onClick={() =>
                  confirm(t("crm.branches.transfers.create.confirmClear"), (ok: boolean) => ok && setLines([]))
                }
              >
                <FaTrash /> {t("crm.branches.transfers.create.clear")}
              </button>
            ) : null
          }
        >
          {repeatNote && <p className="transfer-create__note">{repeatNote}</p>}

          {lines.length === 0 ? (
            <EmptyState
              icon={<FaExchangeAlt />}
              title={t("crm.branches.transfers.create.emptyTitle")}
              text={t("crm.branches.transfers.create.emptyText")}
            />
          ) : (
            <ul className="transfer-lines">
              {lines.map((l) => {
                const err = lineError(l, t);
                const qty = parseQty(l.quantity);
                const left =
                  l.product.quantity != null && Number.isFinite(qty)
                    ? l.product.quantity - qty
                    : null;
                return (
                  <li
                    key={l.product.id}
                    className={`transfer-lines__row${err ? " has-error" : ""}`}
                  >
                    <div className="transfer-lines__info">
                      <span className="transfer-lines__name">{l.product.name}</span>
                      <span className="transfer-lines__meta">
                        {l.product.barcode || l.product.article || "—"}
                        {l.product.quantity != null
                          ? t("crm.branches.transfers.create.inStock", { qty: fmtQty(l.product.quantity) })
                          : t("crm.branches.transfers.create.serverWillCheck")}
                        {left != null &&
                          left >= 0 &&
                          t("crm.branches.transfers.create.willRemain", { qty: fmtQty(left) })}
                      </span>
                      {err && <span className="transfer-lines__error">{err}</span>}
                    </div>

                    <div className="transfer-lines__qty">
                      <button
                        type="button"
                        className="transfer-lines__step"
                        onClick={() => step(l, -1)}
                        aria-label={t("crm.branches.transfers.create.less")}
                      >
                        <FaMinus />
                      </button>
                      <input
                        className="nur-input"
                        inputMode="decimal"
                        value={l.quantity}
                        onChange={(e) => setQty(l.product.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        aria-label={t("crm.branches.transfers.create.qtyAria", { name: l.product.name })}
                      />
                      <button
                        type="button"
                        className="transfer-lines__step"
                        onClick={() => step(l, 1)}
                        aria-label={t("crm.branches.transfers.create.more")}
                      >
                        <FaPlus />
                      </button>
                      {l.product.quantity != null && (
                        <button
                          type="button"
                          className="nur-btn nur-btn--ghost nur-btn--sm"
                          onClick={() =>
                            setQty(l.product.id, String(l.product.quantity))
                          }
                          title={t("crm.branches.transfers.create.moveAllTitle")}
                        >
                          {t("crm.branches.transfers.create.moveAll")}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="nur-btn nur-btn--ghost nur-btn--sm"
                      onClick={() => removeLine(l.product.id)}
                      aria-label={t("crm.branches.transfers.create.remove")}
                    >
                      <FaTrash />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <label className="transfer-form__field transfer-create__comment">
            <span>{t("crm.branches.transfers.common.comment")}</span>
            <input
              className="nur-input"
              value={comment}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("crm.branches.transfers.create.commentPlaceholder")}
            />
          </label>
        </PagePanel>
      </div>
      )}

      <div className="transfer-create__bar">
        <div className="transfer-create__summary">
          <span className="transfer-create__route-text">
            {placeLabel(from)} <FaArrowRight /> {placeLabel(to)}
          </span>
          <span>
            {t("crm.branches.transfers.create.totalsPositions")} <b>{lines.length}</b> ·{" "}
            {t("crm.branches.transfers.create.totalsUnits")} <b>{fmtQty(totals.qty)}</b> ·{" "}
            {t("crm.branches.transfers.create.totalsSum")} <b>{fmtMoney(totals.sum)}</b>
          </span>
          {formError ? (
            <span className="transfer-create__bar-error">{formError}</span>
          ) : (
            blocker && <span className="transfer-create__bar-hint">{blocker}</span>
          )}
        </div>
        <button
          type="button"
          className="nur-btn nur-btn--primary"
          onClick={submit}
          disabled={saving || Boolean(blocker)}
          title={blocker || undefined}
        >
          {saving ? t("crm.branches.transfers.create.submitting") : t("crm.branches.transfers.create.submit")}
        </button>
      </div>
    </PageShell>
  );
};

export default TransferCreatePage;
