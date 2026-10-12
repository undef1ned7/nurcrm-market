import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import i18n from "@shared/config/i18n";
import { registerPdfFonts } from "@shared/lib/pdf/registerFonts";
import type { BranchTransfer } from "@entities/branch";
import {
  fmtDate,
  fmtMoney,
  fmtQty,
  transferPlaceName,
  transferItemAmount,
  transferItemPrice,
} from "./transfers.utils";

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 9, padding: 24, color: "#000" },
  formNote: { fontSize: 7, textAlign: "right", marginBottom: 6 },
  title: { fontSize: 13, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 9, textAlign: "center", marginTop: 3, marginBottom: 10 },
  partiesRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: "#000", padding: 6 },
  partyTitle: { fontWeight: "bold", marginBottom: 3 },
  partyLine: { fontSize: 8, marginBottom: 2 },
  table: { borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
  rowLast: { borderBottomWidth: 0 },
  head: { backgroundColor: "#f0f0f0", fontWeight: "bold" },
  cell: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontSize: 8,
    justifyContent: "center",
  },
  cellLast: { borderRightWidth: 0 },
  colNo: { width: "5%" },
  colName: { width: "35%" },
  colCode: { width: "16%" },
  colUnit: { width: "8%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "12%", textAlign: "right" },
  colSum: { width: "14%", textAlign: "right" },
  totals: { marginTop: 8, alignItems: "flex-end" },
  totalLine: { fontSize: 9, marginBottom: 2 },
  totalBold: { fontSize: 10, fontWeight: "bold" },
  comment: { marginTop: 8, fontSize: 8 },
  cancelled: {
    marginTop: 8,
    fontSize: 9,
    fontWeight: "bold",
    color: "#b91c1c",
    textAlign: "center",
  },
  signatures: { marginTop: 22, flexDirection: "row", gap: 24 },
  signCol: { flex: 1 },
  signLabel: { fontSize: 8, marginBottom: 14 },
  signLine: { borderBottomWidth: 1, borderBottomColor: "#000", marginBottom: 2 },
  signHint: { fontSize: 6, textAlign: "center" },
});

export default function TransferInvoicePdf({
  data,
}: {
  data: BranchTransfer;
}) {
  registerPdfFonts();
  const t = (key: string, opts?: Record<string, unknown>) =>
    i18n.t(`crm.branches.transfers.${key}`, opts) as string;

  const items = Array.isArray(data.items) ? data.items : [];
  const totalQty =
    data.total_quantity != null
      ? Number(data.total_quantity)
      : items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const totalAmount =
    data.total_amount != null
      ? Number(data.total_amount)
      : items.reduce((acc, it) => acc + transferItemAmount(it), 0);
  const seller = data.seller || {};

  return (
    <Document title={t("pdf.docTitle", { number: data.number })}>
      <Page size="A4" style={s.page}>
        <Text style={s.formNote}>
          {t("pdf.formNote")}
        </Text>
        <Text style={s.title}>
          {t("pdf.title", { number: data.number })}
        </Text>
        <Text style={s.subtitle}>{t("pdf.dated", { date: fmtDate(data.date) })}</Text>

        {seller.name ? (
          <Text style={{ marginBottom: 6, fontSize: 9 }}>
            {t("pdf.organization", { name: seller.name })}
            {seller.inn ? t("pdf.inn", { inn: seller.inn }) : ""}
            {seller.address ? `, ${seller.address}` : ""}
          </Text>
        ) : null}

        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyTitle}>{t("pdf.sender")}</Text>
            <Text style={s.partyLine}>{transferPlaceName(data.from_branch)}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyTitle}>{t("pdf.receiver")}</Text>
            <Text style={s.partyLine}>{transferPlaceName(data.to_branch)}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.row, s.head]}>
            <Text style={[s.cell, s.colNo]}>№</Text>
            <Text style={[s.cell, s.colName]}>{t("pdf.colName")}</Text>
            <Text style={[s.cell, s.colCode]}>{t("pdf.colCode")}</Text>
            <Text style={[s.cell, s.colUnit]}>{t("pdf.colUnit")}</Text>
            <Text style={[s.cell, s.colQty]}>{t("pdf.colQty")}</Text>
            <Text style={[s.cell, s.colPrice]}>{t("pdf.colPrice")}</Text>
            <Text style={[s.cell, s.cellLast, s.colSum]}>{t("pdf.colSum")}</Text>
          </View>
          {items.map((it, idx) => (
            <View
              key={it.id || `${it.product}-${idx}`}
              style={[s.row, idx === items.length - 1 ? s.rowLast : {}]}
              wrap={false}
            >
              <Text style={[s.cell, s.colNo]}>{idx + 1}</Text>
              <Text style={[s.cell, s.colName]}>{it.name || "—"}</Text>
              <Text style={[s.cell, s.colCode]}>
                {it.article || it.barcode || "—"}
              </Text>
              <Text style={[s.cell, s.colUnit]}>{it.unit || t("common.pcs")}</Text>
              <Text style={[s.cell, s.colQty]}>{fmtQty(it.quantity)}</Text>
              <Text style={[s.cell, s.colPrice]}>
                {fmtMoney(transferItemPrice(it))}
              </Text>
              <Text style={[s.cell, s.cellLast, s.colSum]}>
                {fmtMoney(transferItemAmount(it))}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <Text style={s.totalLine}>{t("pdf.totalPositions", { n: items.length })}</Text>
          <Text style={s.totalLine}>{t("pdf.totalUnits", { qty: fmtQty(totalQty) })}</Text>
          <Text style={s.totalBold}>{t("pdf.totalAmount", { amount: fmtMoney(totalAmount) })}</Text>
        </View>

        {data.comment ? (
          <Text style={s.comment}>{t("pdf.comment", { comment: data.comment })}</Text>
        ) : null}

        {data.status === "cancelled" ? (
          <Text style={s.cancelled}>
            {t("pdf.cancelled")}
            {data.cancelled_at ? ` ${fmtDate(data.cancelled_at)}` : ""}
          </Text>
        ) : null}

        <View style={s.signatures} wrap={false}>
          <View style={s.signCol}>
            <Text style={s.signLabel}>{t("pdf.released")}</Text>
            <View style={s.signLine} />
            <Text style={s.signHint}>{t("pdf.signHint")}</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signLabel}>{t("pdf.received")}</Text>
            <View style={s.signLine} />
            <Text style={s.signHint}>{t("pdf.signHint")}</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signLabel}>
              {t("pdf.compiled")}
              {data.created_by?.full_name ? `: ${data.created_by.full_name}` : ""}
            </Text>
            <View style={s.signLine} />
            <Text style={s.signHint}>{t("pdf.signHint")}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
