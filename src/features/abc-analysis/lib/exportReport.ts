import type { TFunction } from "i18next";
import type { DateRange } from "@shared/lib/period";
import { toDateInputValue } from "@shared/lib/period";
import type { AbcSliceResult } from "../api/loadAbcSlice";
import type { AbcSliceDef } from "../model/slices";

export type AbcReportSection = {
  slice: AbcSliceDef;
  result: AbcSliceResult;
};

const fmtNum = (n: number, digits = 2) =>
  (Math.round(n * 10 ** digits) / 10 ** digits).toString().replace(".", ",");

function download(filename: string, mime: string, content: string, bom = false) {
  const blob = new Blob([bom ? "﻿" : "", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const periodLabel = (period: DateRange) =>
  `${toDateInputValue(period.from)} — ${toDateInputValue(period.to)}`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function sectionRows(section: AbcReportSection, t: TFunction) {
  const { slice, result } = section;
  const nameHeader = t(`crm.tools.abc.nameHeader.${slice.by ?? "product"}`);
  const head = [
    t("crm.tools.abc.class"),
    nameHeader,
    t(`crm.tools.abc.slices.${slice.id}.measure`),
    t("crm.tools.abc.share"),
    t("crm.tools.abc.cumShare"),
  ];
  const body = result.rows.map((r) => [
    r.abcClass,
    r.name,
    fmtNum(r.value, slice.unit === "qty" ? 3 : 2),
    fmtNum(r.share),
    fmtNum(r.cumShare),
  ]);
  return { head, body };
}

/** Excel: CSV с разделителем «;» и BOM — открывается в Excel без настройки кодировки. */
export function exportAbcCsv(
  sections: AbcReportSection[],
  period: DateRange,
  t: TFunction,
) {
  const lines: string[] = [
    csvCell(t("crm.tools.abc.reportTitle")),
    csvCell(`${t("crm.tools.abc.period")}: ${periodLabel(period)}`),
    "",
  ];
  sections.forEach((section) => {
    const { head, body } = sectionRows(section, t);
    lines.push(csvCell(t(`crm.tools.abc.slices.${section.slice.id}.title`)));
    lines.push(head.map(csvCell).join(";"));
    body.forEach((row) => lines.push(row.map(csvCell).join(";")));
    lines.push("");
  });
  download(
    `abc-report-${toDateInputValue(period.from)}_${toDateInputValue(period.to)}.csv`,
    "text/csv",
    lines.join("\r\n"),
    true,
  );
}

/** Word: HTML-документ с расширением .doc — открывается в Word. */
export function exportAbcWord(
  sections: AbcReportSection[],
  period: DateRange,
  t: TFunction,
) {
  const parts = sections.map((section) => {
    const { head, body } = sectionRows(section, t);
    return `<h2>${escapeHtml(t(`crm.tools.abc.slices.${section.slice.id}.title`))}</h2>
<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-size:11pt">
<tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
${body.map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`).join("\n")}
</table>`;
  });
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(t("crm.tools.abc.reportTitle"))}</title></head><body style="font-family:Calibri,Arial,sans-serif">
<h1>${escapeHtml(t("crm.tools.abc.reportTitle"))}</h1>
<p>${escapeHtml(t("crm.tools.abc.period"))}: ${escapeHtml(periodLabel(period))}</p>
${parts.join("\n")}
</body></html>`;
  download(
    `abc-report-${toDateInputValue(period.from)}_${toDateInputValue(period.to)}.doc`,
    "application/msword",
    html,
  );
}
