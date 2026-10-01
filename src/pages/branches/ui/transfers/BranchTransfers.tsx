import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaExchangeAlt,
  FaPlus,
  FaPlug,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import {
  PageShell,
  PageHeader,
  PagePanel,
  StatusChip,
  SectionTabs,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@shared/ui/page-shell";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  MAIN_WAREHOUSE,
  fetchBranchesAsync,
  fetchTransfers,
  type BranchTransfer,
  type TransferListParams,
  type TransferPage,
} from "@entities/branch";
import TransferDetailsDrawer from "./TransferDetailsDrawer";
import TransferCard from "./TransferCard";
import {
  MAIN_WAREHOUSE_LABEL,
  PERIOD_PRESETS,
  TRANSFER_STATUS_LABEL,
  TRANSFER_STATUS_TONE,
  fmtDate,
  fmtMoney,
  fmtQty,
  shiftDaysIso,
  todayIso,
  transferDirection,
  transferPlaceName,
} from "./transfers.utils";
import "../Branch.scss";
import "./BranchTransfers.scss";

const DIRECTION_TABS = [
  { value: "all", label: "Все" },
  { value: "in", label: "Входящие" },
  { value: "out", label: "Исходящие" },
];

const EMPTY_PAGE: TransferPage = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

const BranchTransfers = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const [params, setParams] = useSearchParams();
  const { list: branches } = useSelector((state: any) => state.branches);

  // Все фильтры живут в URL: ссылкой на историю можно поделиться,
  // а «Назад» из карточки филиала возвращает в то же состояние.
  const branch = params.get("branch") || "";
  const dir = params.get("dir") || "all";
  const status = params.get("status") || "";
  const fromPlace = params.get("from") || "";
  const toPlace = params.get("to") || "";
  const dateFrom = params.get("date_from") || "";
  const dateTo = params.get("date_to") || "";
  const q = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const openId = params.get("open") || "";

  const [search, setSearch] = useState(q);
  const [data, setData] = useState<TransferPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 404 на списке = эндпоинт ещё не выкатили на бэке, а не «сломалось».
  const [notConnected, setNotConnected] = useState(false);

  const patch = useCallback(
    (next: Record<string, string | null>, resetPage = true) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(next)) {
            if (v) p.set(k, v);
            else p.delete(k);
          }
          if (resetPage && !("page" in next)) p.delete("page");
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  useEffect(() => {
    if (!branches.length) dispatch(fetchBranchesAsync(undefined as any));
  }, [branches.length, dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() !== q) patch({ q: search.trim() || null });
    }, 350);
    return () => clearTimeout(t);
  }, [search, q, patch]);

  const query = useMemo<TransferListParams>(() => {
    const out: TransferListParams = { page };
    if (branch) {
      if (dir === "in") out.to_branch = branch;
      else if (dir === "out") out.from_branch = branch;
      else out.branch = branch;
    } else {
      if (fromPlace) out.from_branch = fromPlace;
      if (toPlace) out.to_branch = toPlace;
    }
    if (status) out.status = status as any;
    if (dateFrom) out.date_from = dateFrom;
    if (dateTo) out.date_to = dateTo;
    if (q) out.search = q;
    return out;
  }, [branch, dir, fromPlace, toPlace, status, dateFrom, dateTo, q, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotConnected(false);
    try {
      setData(await fetchTransfers(query));
    } catch (err: any) {
      setData(EMPTY_PAGE);
      if (err?.response?.status === 404) setNotConnected(true);
      else setError(validateResErrors(err?.response?.data || err, ""));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const branchName = branch
    ? branches.find((b: any) => String(b.id) === branch)?.name || "Филиал"
    : "";

  const activePreset = useMemo(() => {
    if (!dateFrom && !dateTo) return "all";
    if (dateTo && dateTo !== todayIso()) return "";
    const hit = PERIOD_PRESETS.find(
      (p) => p.days != null && shiftDaysIso(-p.days) === dateFrom,
    );
    return hit?.value || "";
  }, [dateFrom, dateTo]);

  const applyPreset = (value: string) => {
    const preset = PERIOD_PRESETS.find((p) => p.value === value);
    if (!preset) return;
    patch(
      preset.days == null
        ? { date_from: null, date_to: null }
        : { date_from: shiftDaysIso(-preset.days), date_to: todayIso() },
    );
  };

  const pageTotals = useMemo(
    () =>
      data.items
        .filter((t) => t.status === "completed")
        .reduce(
          (acc, t) => ({
            qty: acc.qty + Number(t.total_quantity || 0),
            sum: acc.sum + Number(t.total_amount || 0),
          }),
          { qty: 0, sum: 0 },
        ),
    [data.items],
  );

  const hasFilters = Boolean(
    status || fromPlace || toPlace || dateFrom || dateTo || q || dir !== "all",
  );

  const placeOptions = (
    <>
      <option value={MAIN_WAREHOUSE}>{MAIN_WAREHOUSE_LABEL}</option>
      {branches.map((b: any) => (
        <option key={b.id} value={String(b.id)}>
          {b.name}
        </option>
      ))}
    </>
  );

  const newTransferUrl = branch
    ? `/crm/branch/transfers/new?to=${branch}`
    : "/crm/branch/transfers/new";

  return (
    <PageShell className="branch transfers">
      <PageHeader
        title={branch ? `Перемещения: ${branchName}` : "История перемещений"}
        subtitle="Передача товаров между главным складом и филиалами"
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={() =>
                navigate(branch ? `/crm/branch/${branch}?tab=transfers` : "/crm/branch")
              }
            >
              <FaArrowLeft /> {branch ? "К филиалу" : "К филиалам"}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => navigate(newTransferUrl)}
            >
              <FaPlus />
              <span className="nur-btn__label">Новое перемещение</span>
            </button>
          </>
        }
      />

      {branch && (
        <SectionTabs
          items={DIRECTION_TABS}
          value={dir}
          onChange={(v: string) => patch({ dir: v === "all" ? null : v })}
        />
      )}

      <section className="transfers-filters" aria-label="Фильтры">
        <div className="transfers-filters__row">
          <label className="transfers-filters__search">
            <FaSearch aria-hidden="true" />
            <input
              className="nur-input"
              placeholder="Номер, склад или комментарий"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {!branch && (
            <>
              <select
                className="nur-input transfers-filters__select"
                value={fromPlace}
                onChange={(e) => patch({ from: e.target.value || null })}
                aria-label="Откуда"
              >
                <option value="">Откуда: все</option>
                {placeOptions}
              </select>
              <select
                className="nur-input transfers-filters__select"
                value={toPlace}
                onChange={(e) => patch({ to: e.target.value || null })}
                aria-label="Куда"
              >
                <option value="">Куда: все</option>
                {placeOptions}
              </select>
            </>
          )}

          <select
            className="nur-input transfers-filters__select"
            value={status}
            onChange={(e) => patch({ status: e.target.value || null })}
            aria-label="Статус"
          >
            <option value="">Статус: все</option>
            <option value="completed">Проведено</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>

        <div className="transfers-filters__row transfers-filters__row--period">
          <div
            className="transfers-filters__segment"
            role="group"
            aria-label="Период"
          >
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={activePreset === p.value ? "is-active" : ""}
                aria-pressed={activePreset === p.value}
                onClick={() => applyPreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="transfers-filters__range">
            <span>с</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => patch({ date_from: e.target.value || null })}
              aria-label="С даты"
            />
            <span>по</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => patch({ date_to: e.target.value || null })}
              aria-label="По дату"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="transfers-filters__reset"
              onClick={() => {
                setSearch("");
                patch({
                  q: null,
                  status: null,
                  from: null,
                  to: null,
                  date_from: null,
                  date_to: null,
                  dir: null,
                });
              }}
            >
              <FaTimes /> Сбросить фильтры
            </button>
          )}
        </div>
      </section>

      <PagePanel flush className="transfers__panel">
        {!loading && !error && !notConnected && data.items.length > 0 && (
          <div className="transfers__summary">
            <span>
              Найдено <b>{data.count}</b>
            </span>
            <span>
              Проведено на странице: <b>{fmtQty(pageTotals.qty)}</b> ед. на{" "}
              <b>{fmtMoney(pageTotals.sum)}</b> сом
            </span>
          </div>
        )}
        {loading ? (
          <LoadingState rows={6} />
        ) : notConnected ? (
          <EmptyState
            icon={<FaPlug />}
            title="Перемещения ещё не подключены"
            text="Сервер пока не поддерживает перемещения товаров. Раздел заработает после обновления бэкенда — создавать перемещения сейчас не получится."
          />
        ) : error ? (
          <ErrorState
            text={error || undefined}
            action={
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={load}
              >
                Повторить
              </button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<FaExchangeAlt />}
            title={hasFilters ? "Ничего не найдено" : "Перемещений пока нет"}
            text={
              hasFilters
                ? "Измените фильтры или период."
                : "Перенесите товары с главного склада в филиал или между филиалами."
            }
            action={
              !hasFilters && (
                <button
                  type="button"
                  className="nur-btn nur-btn--primary"
                  onClick={() => navigate(newTransferUrl)}
                >
                  <FaPlus /> Новое перемещение
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="nur-table-wrap transfers__table-wrap">
              <table className="nur-table transfers__table">
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Дата</th>
                    <th>Маршрут</th>
                    <th className="is-num">Позиций</th>
                    <th className="is-num">Кол-во</th>
                    <th className="is-num">Сумма, сом</th>
                    <th>Провёл</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row: BranchTransfer) => {
                    const d = transferDirection(row, branch);
                    return (
                      <tr
                        key={row.id}
                        className={`transfers__row${row.status === "cancelled" ? " is-cancelled" : ""}`}
                        onClick={() => patch({ open: row.id }, false)}
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === "Enter" && patch({ open: row.id }, false)
                        }
                      >
                        <td className="transfers__number">{row.number}</td>
                        <td className="transfers__date">{fmtDate(row.date)}</td>
                        <td>
                          <span className="transfers__route">
                            {d === "in" && (
                              <span
                                className="transfers__dir transfers__dir--in"
                                title="Входящее"
                              >
                                <FaArrowDown />
                              </span>
                            )}
                            {d === "out" && (
                              <span
                                className="transfers__dir transfers__dir--out"
                                title="Исходящее"
                              >
                                <FaArrowUp />
                              </span>
                            )}
                            <span className="transfers__place">
                              {transferPlaceName(row.from_branch)}
                            </span>
                            <FaArrowRight className="transfers__route-arrow" />
                            <span className="transfers__place">
                              {transferPlaceName(row.to_branch)}
                            </span>
                          </span>
                        </td>
                        <td className="is-num">
                          {row.items_count ?? row.items?.length ?? "—"}
                        </td>
                        <td className="is-num">{fmtQty(row.total_quantity)}</td>
                        <td className="is-num">{fmtMoney(row.total_amount)}</td>
                        <td>{row.created_by?.full_name || "—"}</td>
                        <td>
                          <StatusChip tone={TRANSFER_STATUS_TONE[row.status]}>
                            {TRANSFER_STATUS_LABEL[row.status] || row.status}
                          </StatusChip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="transfers__cards">
              {data.items.map((row) => (
                <TransferCard
                  key={row.id}
                  row={row}
                  branchId={branch}
                  onOpen={() => patch({ open: row.id }, false)}
                />
              ))}
            </ul>
          </>
        )}

        {!loading && (data.previous || data.next) && (
          <div className="transfers__pager">
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              disabled={!data.previous}
              onClick={() =>
                patch({ page: page > 2 ? String(page - 1) : null }, false)
              }
            >
              <FaArrowLeft /> Назад
            </button>
            <span>Страница {page}</span>
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              disabled={!data.next}
              onClick={() => patch({ page: String(page + 1) }, false)}
            >
              Далее <FaArrowRight />
            </button>
          </div>
        )}
      </PagePanel>

      {openId && (
        <TransferDetailsDrawer
          id={openId}
          onClose={() => patch({ open: null }, false)}
          onChanged={load}
        />
      )}
    </PageShell>
  );
};

export default BranchTransfers;
