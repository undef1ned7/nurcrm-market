import { pdf } from "@react-pdf/renderer";
import { fetchTransfer, type BranchTransfer } from "@entities/branch";
import TransferInvoicePdf from "./TransferInvoicePdf";

/** В списке позиции могут не приходить — тогда берём полную накладную. */
export async function withItems(t: BranchTransfer): Promise<BranchTransfer> {
  return t.items?.length ? t : fetchTransfer(t.id);
}

async function renderBlob(t: BranchTransfer) {
  return pdf(<TransferInvoicePdf data={await withItems(t)} />).toBlob();
}

export async function downloadTransferPdf(t: BranchTransfer) {
  const url = window.URL.createObjectURL(await renderBlob(t));
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `transfer_${t.number}.pdf`;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/** Открывает PDF во вкладке браузера — печать оттуда (Ctrl+P). */
export async function openTransferPdf(t: BranchTransfer) {
  // Окно открываем синхронно, иначе блокировщик попапов его закроет.
  const win = window.open("", "_blank");
  try {
    const url = window.URL.createObjectURL(await renderBlob(t));
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}
