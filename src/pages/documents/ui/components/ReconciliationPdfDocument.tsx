import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts } from "@shared/lib/pdf/registerFonts";
import { shortenUuidsInText } from "@shared/lib/pdf/shortenUuid";
import { buildReconciliation } from "./reconciliationRows";

const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 8,
    padding: 16,
    color: "#000",
  },
  header: {
    textAlign: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    marginTop: 1,
  },
  parties: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 8,
    lineHeight: 1.25,
  },
  // Таблица в стиле "классического" акта (как на фото)
  table: { borderWidth: 1, borderColor: "#000" },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 14,
  },
  rowLast: { borderBottomWidth: 0 },
  head: { backgroundColor: "#f5f5f5", fontWeight: "bold" },
  cell: {
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 3,
    justifyContent: "center",
    overflow: "hidden",
  },
  wrapText: {
    width: "100%",
  },
  cellLast: { borderRightWidth: 0 },
  // 2 блока по 4 колонки:
  // Date | Doc | Debit | Credit  (company)
  // Date | Doc | Debit | Credit  (client)
  cDate: { width: "9%" },
  cDoc: { width: "20%" },
  cMoney: { width: "9%" },
  // Служебные строки
  sectionRow: { backgroundColor: "#f5f5f5", fontWeight: "bold" },
  sectionCell: { padding: 3, fontWeight: "bold" },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
  summary: { marginTop: 8, fontSize: 9, lineHeight: 1.4 },
  summaryTotal: { fontWeight: "bold" },
  signatures: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
  },
  signCol: { flex: 1, fontSize: 8 },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 16,
    marginTop: 10,
  },
});

function safe(v: any) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function n2(v: any) {
  const num = Number(v || 0);
  return num
    .toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/[\u00A0\u202F]/g, " ");
}

function fmtDate(dt: any) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function pick(obj: any, keys: any, fallback: any = "") {
  for (const k of keys) {
    if (keys.includes('.')) {
      const [key, subkey] = k.split('.');
      const v = obj?.[key];
      if (v !== undefined && v !== null && v !== "") return v?.[subkey];
    } else {
      const v = obj?.[k];
      if (typeof v === 'object') {
        continue;
      }
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return fallback;
}

function getNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickFirst(obj: any, keys: any) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function pickDate(row: any) {
  return pickFirst(row, ["date", "datetime", "created_at", "document_date"]);
}

function pickDoc(row: any) {
  return pickFirst(row, ["document", "doc", "title", "description", "content", "name"]);
}

function renderSaldoCells(value: any, { TextComp, styles }: any) {
  // value: number, >0 => Debit, <0 => Credit
  const v = getNumber(value);
  const debit = v > 0 ? v : 0;
  const credit = v < 0 ? Math.abs(v) : 0;
  return (
    <>
      <View style={[styles.cell, styles.cMoney]}>
        <TextComp style={styles.right}>{debit ? n2(debit) : ""}</TextComp>
      </View>
      <View style={[styles.cell, styles.cMoney]}>
        <TextComp style={styles.right}>{credit ? n2(credit) : ""}</TextComp>
      </View>
    </>
  );
}

export default function ReconciliationPdfDocument({ data, meta }: any) {
  registerPdfFonts();

  const companyName = meta?.companyName || safe(
    pick(data, ["company_name", "company.name", "seller.name", "our_company_name"], meta?.companyName)
  );
  const clientName = meta?.clientName || safe(pick(data, ["client_name", "client.name", "buyer.name", "counterparty"], meta?.clientName));
  const start = pick(data, ["start", "date_from", "period_start"], meta?.start);
  const end = pick(data, ["end", "date_to", "period_end"], meta?.end);
  const currency = safe(pick(data, ["currency"], meta?.currency || "KGS"));

  // Обороты и сальдо считаем без справочных строк (дубль «Сделка: Долг» при продаже).
  const recon = buildReconciliation(data);
  const { lines, totals, closingCompany, closingClient } = recon;
  const {
    companyDebit: totalCompanyDebit,
    companyCredit: totalCompanyCredit,
    clientDebit: totalClientDebit,
    clientCredit: totalClientCredit,
  } = totals;
  const { openingCompany, openingClient } = recon;
  const balanceLabel =
    closingCompany > 0
      ? "Остаток задолженности клиента"
      : closingCompany < 0
        ? "Переплата клиента"
        : "Остаток задолженности";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Акт сверки</Text>
          <Text style={s.subtitle}>
            взаимных расчетов за период: {fmtDate(start)} — {fmtDate(end)} ({currency})
          </Text>
        </View>

        <View style={s.parties}>
          <Text>
            Мы, нижеподписавшиеся, {companyName}, с одной стороны, и {clientName}, с другой стороны,
            составили настоящий акт сверки о состоянии взаимных расчетов по данным учета следующим
            образом:
          </Text>
        </View>

        <View style={s.table}>
          {/* Заголовок: две части как на фото */}
          <View style={[s.row, s.head]}>
            <View style={[s.cell, { width: "47%" }]}>
              <Text style={s.center}>По данным {companyName}</Text>
            </View>
            <View style={[s.cell, { width: "53%" }, s.cellLast]}>
              <Text style={s.center}>По данным {clientName}</Text>
            </View>
          </View>

          {/* Заголовок колонок */}
          <View style={[s.row, s.head]}>
            <View style={[s.cell, s.cDate]}>
              <Text style={s.center}>Дата</Text>
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text style={s.center}>Документ</Text>
            </View>
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.center}>Дебет</Text>
            </View>
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.center}>Кредит</Text>
            </View>

            <View style={[s.cell, s.cDate]}>
              <Text style={s.center}>Дата</Text>
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text style={s.center}>Документ</Text>
            </View>
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.center}>Дебет</Text>
            </View>
            <View style={[s.cell, s.cMoney, s.cellLast]}>
              <Text style={s.center}>Кредит</Text>
            </View>
          </View>

          {/* Сальдо начальное */}
          <View style={[s.row, s.sectionRow]}>
            <View style={[s.cell, { width: "100%" }, s.cellLast]}>
              <Text>Сальдо начальное</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.cell, s.cDate]}>
              <Text />
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text />
            </View>
            {renderSaldoCells(openingCompany, { TextComp: Text, styles: s })}
            <View style={[s.cell, s.cDate]}>
              <Text />
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text />
            </View>
            {renderSaldoCells(openingClient, { TextComp: Text, styles: s })}
            {/* последняя ячейка уже в helper */}
            <View style={{ width: 0 }} />
          </View>

          {/* Операции */}
          {lines.map(({ row: r, amounts, reference }, idx) => {
            const dt = pickDate(r);
            const doc = pickDoc(r);
            const { companyDebit, companyCredit, clientDebit, clientCredit } =
              amounts;
            const docText = `${shortenUuidsInText(safe(doc))}${
              reference ? " (справочно, в оборот не входит)" : ""
            }`;
            const money = (v: number) => (!reference && v ? n2(v) : "");

            return (
              <View key={idx} style={s.row}>
                <View style={[s.cell, s.cDate]}>
                  <Text>{dt ? fmtDate(dt) : ""}</Text>
                </View>
                <View style={[s.cell, s.cDoc]}>
                  <Text style={s.wrapText}>{docText}</Text>
                </View>
                <View style={[s.cell, s.cMoney]}>
                  <Text style={s.right}>{money(companyDebit)}</Text>
                </View>
                <View style={[s.cell, s.cMoney]}>
                  <Text style={s.right}>{money(companyCredit)}</Text>
                </View>

                <View style={[s.cell, s.cDate]}>
                  <Text>{dt ? fmtDate(dt) : ""}</Text>
                </View>
                <View style={[s.cell, s.cDoc]}>
                  <Text style={s.wrapText}>{docText}</Text>
                </View>
                <View style={[s.cell, s.cMoney]}>
                  <Text style={s.right}>{money(clientDebit)}</Text>
                </View>
                <View style={[s.cell, s.cMoney, s.cellLast]}>
                  <Text style={s.right}>{money(clientCredit)}</Text>
                </View>
              </View>
            );
          })}

          {/* Обороты за период */}
          <View style={[s.row, s.sectionRow]}>
            <View style={[s.cell, { width: "100%" }, s.cellLast]}>
              <Text>Обороты за период</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.cell, s.cDate]}>
              <Text />
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text />
            </View>
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.right}>{n2(totalCompanyDebit)}</Text>
            </View>
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.right}>{n2(totalCompanyCredit)}</Text>
            </View>

            <View style={[s.cell, s.cDate]}>
              <Text />
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text />
            </View>
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.right}>{n2(totalClientDebit)}</Text>
            </View>
            <View style={[s.cell, s.cMoney, s.cellLast]}>
              <Text style={s.right}>{n2(totalClientCredit)}</Text>
            </View>
          </View>

          {/* Сальдо конечное */}
          <View style={[s.row, s.sectionRow]}>
            <View style={[s.cell, { width: "100%" }, s.cellLast]}>
              <Text>Сальдо конечное</Text>
            </View>
          </View>
          <View style={[s.row, s.rowLast]}>
            <View style={[s.cell, s.cDate]}>
              <Text />
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text />
            </View>
            {renderSaldoCells(closingCompany, { TextComp: Text, styles: s })}
            <View style={[s.cell, s.cDate]}>
              <Text />
            </View>
            <View style={[s.cell, s.cDoc]}>
              <Text />
            </View>
            {/* client */}
            <View style={[s.cell, s.cMoney]}>
              <Text style={s.right}>{closingClient > 0 ? n2(closingClient) : ""}</Text>
            </View>
            <View style={[s.cell, s.cMoney, s.cellLast]}>
              <Text style={s.right}>{closingClient < 0 ? n2(Math.abs(closingClient)) : ""}</Text>
            </View>
          </View>
        </View>

        <View style={s.summary}>
          <Text>Начислено: {n2(totalCompanyDebit)}</Text>
          <Text>Оплачено / зачтено: {n2(totalCompanyCredit)}</Text>
          <Text style={s.summaryTotal}>
            {balanceLabel}: {n2(Math.abs(closingCompany))} {currency}
          </Text>
        </View>

        <View style={s.signatures}>
          <View style={s.signCol}>
            <Text>От {companyName}</Text>
            <View style={s.signLine} />
          </View>
          <View style={s.signCol}>
            <Text>От {clientName}</Text>
            <View style={s.signLine} />
          </View>
        </View>
      </Page>
    </Document>
  );
}