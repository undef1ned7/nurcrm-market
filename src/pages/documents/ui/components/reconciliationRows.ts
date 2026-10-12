/**
 * Расчёт акта сверки (`GET .../reconciliation/json/`) по строкам, пришедшим с бэка.
 *
 * Защита от двойного начисления долга: продажа в долг на кассе создаёт две
 * сущности на одну сумму — «Продажа» (checkout) и «Сделка: Долг» (график
 * платежей). Сделка — это ссылка на продажу, а не второе начисление, поэтому
 * строка сделки, у которой есть «парная» продажа на ту же сумму, остаётся в
 * акте справочно (без сумм) и в обороты/сальдо не входит.
 * Контракт для бэка: docs/backend/kassa/client-reconciliation-double-debt-backend.md
 */

export type ReconRow = Record<string, any>;

export type ReconAmounts = {
  companyDebit: number;
  companyCredit: number;
  clientDebit: number;
  clientCredit: number;
};

export type ReconLine = {
  row: ReconRow;
  amounts: ReconAmounts;
  /** Строка показана справочно и не входит в обороты (дубль начисления). */
  reference: boolean;
};

export type ReconResult = {
  lines: ReconLine[];
  openingCompany: number;
  openingClient: number;
  totals: ReconAmounts;
  closingCompany: number;
  closingClient: number;
  /** Сколько строк «Сделка: Долг» исключено как дубль продажи. */
  excludedDuplicates: number;
};

const MAX_PAIR_GAP_MS = 3 * 24 * 60 * 60 * 1000;
const EPS = 0.005;

export const getNumber = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pickFirst = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

export const extractLines = (data: any): ReconRow[] => {
  const candidates = [
    data?.rows,
    data?.items,
    data?.lines,
    data?.entries,
    data?.table,
    data?.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

export const getRowAmounts = (r: ReconRow): ReconAmounts => ({
  companyDebit: getNumber(
    r?.a_debit ?? r?.company_debit ?? r?.debit_company ?? r?.company_dt ?? 0,
  ),
  companyCredit: getNumber(
    r?.a_credit ?? r?.company_credit ?? r?.credit_company ?? r?.company_kt ?? 0,
  ),
  clientDebit: getNumber(
    r?.b_debit ?? r?.client_debit ?? r?.debit_client ?? r?.client_dt ?? 0,
  ),
  clientCredit: getNumber(
    r?.b_credit ?? r?.client_credit ?? r?.credit_client ?? r?.client_kt ?? 0,
  ),
});

const rowType = (r: ReconRow) =>
  String(pickFirst(r, ["ref_type", "doc_type", "type", "document_type"]) ?? "")
    .trim()
    .toLowerCase();

const rowText = (r: ReconRow) =>
  String(
    pickFirst(r, ["title", "document", "doc", "description", "content", "name"]) ??
      "",
  ).trim();

const rowTime = (r: ReconRow) => {
  const raw = pickFirst(r, ["date", "datetime", "created_at", "document_date"]);
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Бэк явно пометил строку как справочную — доверяем ему в первую очередь. */
const isExplicitReference = (r: ReconRow) =>
  r?.affects_balance === false ||
  r?.is_informational === true ||
  r?.informational === true ||
  r?.is_reference === true;

const isSaleRow = (r: ReconRow) =>
  ["sale", "продажа"].includes(rowType(r)) || /^продажа\b/i.test(rowText(r));

/** «Сделка: Долг Имя (Долг)» — сделка вида debt (не предоплата/оплата). */
const isDebtDealRow = (r: ReconRow) => {
  const kind = String(r?.kind ?? r?.deal_kind ?? "").toLowerCase();
  if (kind) return kind === "debt" && isDealLike(r);
  return isDealLike(r) && /\(долг\)\s*$/i.test(rowText(r));
};

const isDealLike = (r: ReconRow) =>
  ["deal", "transaction", "сделка"].includes(rowType(r)) ||
  /^сделка\s*:/i.test(rowText(r));

/**
 * Находит строки «Сделка: Долг», дублирующие начисление продажи: на ту же
 * сумму по дебету компании, с разницей по дате не более 3 суток; каждая
 * продажа «гасит» не больше одной сделки.
 */
const findDuplicateDealIndexes = (rows: ReconRow[]): Set<number> => {
  const dup = new Set<number>();
  const usedSales = new Set<number>();

  rows.forEach((deal, di) => {
    if (!isDebtDealRow(deal) || isExplicitReference(deal)) return;
    const dealAmt = getRowAmounts(deal).companyDebit;
    if (dealAmt <= 0) return;
    const dealTime = rowTime(deal);

    let best = -1;
    let bestGap = Infinity;
    rows.forEach((sale, si) => {
      if (usedSales.has(si) || !isSaleRow(sale) || isExplicitReference(sale)) {
        return;
      }
      if (Math.abs(getRowAmounts(sale).companyDebit - dealAmt) > EPS) return;
      const saleTime = rowTime(sale);
      const gap =
        dealTime !== null && saleTime !== null
          ? Math.abs(dealTime - saleTime)
          : 0;
      if (gap > MAX_PAIR_GAP_MS) return;
      if (gap < bestGap) {
        bestGap = gap;
        best = si;
      }
    });

    if (best >= 0) {
      usedSales.add(best);
      dup.add(di);
    }
  });

  return dup;
};

const ZERO: ReconAmounts = {
  companyDebit: 0,
  companyCredit: 0,
  clientDebit: 0,
  clientCredit: 0,
};

export const buildReconciliation = (data: any): ReconResult => {
  const rows = extractLines(data);
  const dupIdx = findDuplicateDealIndexes(rows);

  const lines: ReconLine[] = rows.map((row, i) => ({
    row,
    amounts: getRowAmounts(row),
    reference: dupIdx.has(i) || isExplicitReference(row),
  }));

  const totals = lines.reduce<ReconAmounts>(
    (acc, l) =>
      l.reference
        ? acc
        : {
            companyDebit: acc.companyDebit + l.amounts.companyDebit,
            companyCredit: acc.companyCredit + l.amounts.companyCredit,
            clientDebit: acc.clientDebit + l.amounts.clientDebit,
            clientCredit: acc.clientCredit + l.amounts.clientCredit,
          },
    { ...ZERO },
  );

  const openingCompany = getNumber(
    pickFirst(data, [
      "opening_company",
      "opening_company_balance",
      "opening_balance_company",
      "opening_balance",
    ]) ?? 0,
  );
  const openingClient = getNumber(
    pickFirst(data, [
      "opening_client",
      "opening_client_balance",
      "opening_balance_client",
    ]) ?? 0,
  );

  return {
    lines,
    openingCompany,
    openingClient,
    totals,
    closingCompany: openingCompany + totals.companyDebit - totals.companyCredit,
    closingClient: openingClient + totals.clientDebit - totals.clientCredit,
    excludedDuplicates: dupIdx.size,
  };
};
