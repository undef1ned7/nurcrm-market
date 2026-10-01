import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
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
  MAIN_WAREHOUSE_LABEL,
  fmtMoney,
  fmtQty,
  parseQty,
  placeToApi,
  placeToStockParam,
  todayIso,
} from "./transfers.utils";
import "../Branch.scss";
import "./BranchTransfers.scss";

type Line = { product: TransferProduct; quantity: string };

const lineError = (l: Line): string => {
  const qty = parseQty(l.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return "Укажите количество";
  if (!l.product.is_weight && !Number.isInteger(qty)) return "Только целое";
  if (l.product.quantity != null && qty > l.product.quantity) {
    return `Доступно ${fmtQty(l.product.quantity)}`;
  }
  return "";
};

const unitCost = (p: TransferProduct) => p.purchase_price ?? p.price ?? 0;

const TransferCreatePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const alert = useAlert();
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const { list: branches, loading: branchesLoading } = useSelector(
    (state: any) => state.branches,
  );

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
      { value: "", label: MAIN_WAREHOUSE_LABEL, active: true },
      ...branches.map((b: any) => ({
        value: String(b.id),
        label: b.name || "Без названия",
        active: b.is_active !== false,
      })),
    ],
    [branches],
  );
  // «Куда» по умолчанию — первый активный филиал, чтобы форма не открывалась
  // с ошибкой «Главный склад → Главный склад».
  useEffect(() => {
    if (params.get("to") || params.get("repeat") || to !== from) return;
    const target = places.find((p) => p.value && p.value !== from && p.active);
    if (target) setTo(target.value);
  }, [places, from, to, params]);

  const placeLabel = (v: string) =>
    places.find((p) => p.value === v)?.label || MAIN_WAREHOUSE_LABEL;

  // «Повторить перемещение»: маршрут и позиции из старого документа.
  // Текущий остаток неизвестен — его проверит сервер при проведении.
  useEffect(() => {
    const repeatId = params.get("repeat");
    if (!repeatId) return;
    fetchTransfer(repeatId)
      .then((t) => {
        setFrom(t.from_branch?.id ? String(t.from_branch.id) : "");
        setTo(t.to_branch?.id ? String(t.to_branch.id) : "");
        setComment(t.comment || "");
        setLines(
          (t.items || []).map((it) => ({
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
        setRepeatNote(`Позиции скопированы из ${t.number}. Проверьте количества.`);
      })
      .catch(() => setRepeatNote("Не удалось загрузить перемещение для повтора."));
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
      "Склад-отправитель изменится, выбранные товары будут очищены. Продолжить?",
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
      "Направление поменяется, выбранные товары будут очищены. Продолжить?",
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
        setFormError(`Товар «${code}» не найден на складе «${placeLabel(from)}»`);
        return;
      }
      if (exact.quantity != null && exact.quantity <= 0) {
        setFormError(`«${exact.name}»: нет остатка на складе-отправителе`);
        return;
      }
      addProduct(exact);
      setQuery("");
    } catch {
      setFormError("Не удалось выполнить поиск");
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

  const invalidLines = lines.filter((l) => lineError(l)).length;
  const routeError =
    from === to ? "Отправитель и получатель должны отличаться" : "";
  const toInactive = to && places.find((p) => p.value === to)?.active === false;
  const blocker =
    routeError ||
    (toInactive ? "Филиал-получатель неактивен" : "") ||
    (!date ? "Укажите дату" : "") ||
    (!lines.length ? "Добавьте товары" : "") ||
    (invalidLines ? `Исправьте позиции: ${invalidLines}` : "");

  const submit = () => {
    if (saving) return;
    if (blocker) {
      setFormError(blocker);
      return;
    }
    confirm(
      `Провести перемещение: ${placeLabel(from)} → ${placeLabel(to)}, ` +
        `${lines.length} поз., ${fmtQty(totals.qty)} ед.? Остатки изменятся сразу.`,
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
              "Перемещение проведено, но накладную сформировать не удалось. Её можно скачать из истории.",
              true,
            );
          }
          navigate(`/crm/branch/transfers?open=${created.id}`, { replace: true });
        } catch (err: any) {
          setFormError(
            validateResErrors(
              err?.response?.data || err,
              "Не удалось провести перемещение. ",
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
        title="Новое перемещение"
        subtitle="Передача товаров между главным складом и филиалами"
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--ghost"
            onClick={() =>
              withLinesGuard("Уйти без сохранения? Выбранные товары пропадут.", () =>
                navigate("/crm/branch/transfers"),
              )
            }
          >
            <FaArrowLeft /> К истории
          </button>
        }
      />

      <section className="transfer-route" aria-label="Маршрут перемещения">
        <label className="transfer-route__card">
          <span className="transfer-route__icon transfer-route__icon--from">
            <PlaceIcon value={from} />
          </span>
          <span className="transfer-route__text">
            <span className="transfer-route__caption">Откуда</span>
            <select
              className="transfer-route__select"
              value={from}
              onChange={(e) => changeFrom(e.target.value)}
            >
              {places.map((p) => (
                <option key={p.value || "main"} value={p.value}>
                  {p.label}
                  {p.active ? "" : " (неактивен)"}
                </option>
              ))}
            </select>
          </span>
        </label>

        <button
          type="button"
          className="transfer-route__swap"
          onClick={swap}
          title="Поменять местами"
          aria-label="Поменять местами"
        >
          <FaExchangeAlt />
        </button>

        <label className={`transfer-route__card${routeError ? " has-error" : ""}`}>
          <span className="transfer-route__icon transfer-route__icon--to">
            <PlaceIcon value={to} />
          </span>
          <span className="transfer-route__text">
            <span className="transfer-route__caption">Куда</span>
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
                  {p.active ? "" : " (неактивен)"}
                </option>
              ))}
            </select>
            {routeError && <span className="transfer-route__error">{routeError}</span>}
          </span>
        </label>

        <label className="transfer-route__card transfer-route__card--date">
          <span className="transfer-route__text">
            <span className="transfer-route__caption">Дата документа</span>
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

      {!branchesLoading && branches.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={<FaStore />}
            title="Нет филиалов"
            text="Перемещать товары можно между главным складом и филиалами. Сначала создайте филиал."
            action={
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={() => navigate("/crm/branch")}
              >
                <FaPlus /> К филиалам
              </button>
            }
          />
        </PagePanel>
      ) : (
      <div className="transfer-create__grid">
        <PagePanel
          title="Товары на складе-отправителе"
          description={placeLabel(from)}
          className="transfer-create__picker"
        >
          <div className="branch__search">
            <FaBarcode className="branch__search-icon" />
            <input
              ref={searchRef}
              autoFocus
              className="nur-input branch__search-input"
              placeholder="Название или скан штрихкода + Enter"
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
                aria-label="Очистить поиск"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <ul className="transfer-form__found">
            {searching && found.length === 0 && (
              <li className="transfer-form__hint">Загрузка товаров…</li>
            )}
            {!searching && searchFailed && (
              <li className="transfer-form__hint transfer-form__hint--error">
                Не удалось загрузить товары склада.{" "}
                <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
                  Повторить
                </button>
              </li>
            )}
            {!searching && !searchFailed && found.length === 0 && (
              <li className="transfer-form__hint">
                {query
                  ? `По запросу «${query}» ничего нет`
                  : "На этом складе нет товаров"}
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
                      {empty ? "нет в наличии" : `${fmtQty(p.quantity)} ${p.unit || "шт"}`}
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
          title={`К перемещению${lines.length ? ` · ${lines.length}` : ""}`}
          className="transfer-create__lines"
          actions={
            lines.length ? (
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm"
                onClick={() =>
                  confirm("Очистить все позиции?", (ok: boolean) => ok && setLines([]))
                }
              >
                <FaTrash /> Очистить
              </button>
            ) : null
          }
        >
          {repeatNote && <p className="transfer-create__note">{repeatNote}</p>}

          {lines.length === 0 ? (
            <EmptyState
              icon={<FaExchangeAlt />}
              title="Документ пуст"
              text="Нажмите на товар слева или отсканируйте штрихкод."
            />
          ) : (
            <ul className="transfer-lines">
              {lines.map((l) => {
                const err = lineError(l);
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
                          ? ` · на складе ${fmtQty(l.product.quantity)}`
                          : " · остаток проверит сервер"}
                        {left != null && left >= 0 && ` · останется ${fmtQty(left)}`}
                      </span>
                      {err && <span className="transfer-lines__error">{err}</span>}
                    </div>

                    <div className="transfer-lines__qty">
                      <button
                        type="button"
                        className="transfer-lines__step"
                        onClick={() => step(l, -1)}
                        aria-label="Меньше"
                      >
                        <FaMinus />
                      </button>
                      <input
                        className="nur-input"
                        inputMode="decimal"
                        value={l.quantity}
                        onChange={(e) => setQty(l.product.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`Количество: ${l.product.name}`}
                      />
                      <button
                        type="button"
                        className="transfer-lines__step"
                        onClick={() => step(l, 1)}
                        aria-label="Больше"
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
                          title="Переместить весь остаток"
                        >
                          Всё
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="nur-btn nur-btn--ghost nur-btn--sm"
                      onClick={() => removeLine(l.product.id)}
                      aria-label="Убрать"
                    >
                      <FaTrash />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <label className="transfer-form__field transfer-create__comment">
            <span>Комментарий</span>
            <input
              className="nur-input"
              value={comment}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: пополнение витрины"
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
            Позиций: <b>{lines.length}</b> · Единиц: <b>{fmtQty(totals.qty)}</b> ·
            Сумма ≈ <b>{fmtMoney(totals.sum)}</b>
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
          {saving ? "Проведение…" : "Провести и распечатать накладную"}
        </button>
      </div>
    </PageShell>
  );
};

export default TransferCreatePage;
