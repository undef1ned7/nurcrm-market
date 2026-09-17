import { useState, useEffect } from "react";
import { X, Printer, Download } from "lucide-react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { pdf } from "@react-pdf/renderer";
import { getReceiptJson } from "@entities/sale";
import {
  handleCheckoutResponseForPrinting,
  checkPrinterConnection,
  mapMarketReceiptItem,
} from "@pages/sell/ui/services/printService";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import ReceiptPdfDocument from "./ReceiptPdfDocument";
import "./ReceiptPreviewModal.scss";

const ReceiptPreviewModal = ({
  receiptId,
  receiptData: initialReceiptData,
  onClose,
  onEdit: _onEdit,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [receiptData, setReceiptData] = useState(initialReceiptData);
  const [loading, setLoading] = useState(!initialReceiptData);
  const [printing, setPrinting] = useState<any>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<any>(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Если данные уже переданы, используем их
    if (initialReceiptData) {
      setReceiptData(initialReceiptData);
      setLoading(false);
      return;
    }

    // Иначе загружаем данные
    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await dispatch((getReceiptJson(receiptId) as any));
        if (result.type === "products/getReceiptJson/fulfilled") {
          setReceiptData(result.payload);
        } else {
          setError(t("crm.cashier.receiptPreview.loadFailed"));
        }
      } catch (err: any) {
        console.error("Ошибка при загрузке чека:", err);
        setError(t("crm.cashier.receiptPreview.loadErrorGeneric"));
      } finally {
        setLoading(false);
      }
    };

    if (receiptId) {
      loadReceipt();
    }
  }, [receiptId, initialReceiptData, dispatch]);

  const handlePrint = async () => {
    if (!receiptData && !receiptId) return;

    // Проверяем подключение принтера
    const isPrinterConnected = await checkPrinterConnection();

    if (!isPrinterConnected) {
      alert(t("crm.cashier.receiptPreview.printerNotConnected"));
      return;
    }

    setPrinting(true);
    try {
      let dataToPrint = receiptData;

      // Если данных нет, загружаем их заново
      if (!dataToPrint && receiptId) {
        const result = await dispatch((getReceiptJson(receiptId) as any));
        if (result.type === "products/getReceiptJson/fulfilled") {
          dataToPrint = result.payload;
        } else {
          throw new Error(t("crm.cashier.receiptPreview.printDataLoadFailed"));
        }
      }

      if (dataToPrint && Array.isArray(dataToPrint.items)) {
        // Преобразуем данные в формат для печати
        const orderDiscount = parseFloat(
          dataToPrint.totals?.discount_total || 0,
        );
        const printData = {
          items: dataToPrint.items.map((item: any) => ({
            name: item.name,
            qty: parseFloat(item.qty ?? item.quantity),
            unit_price: parseFloat(item.unit_price ?? item.price),
            price: parseFloat(item.unit_price ?? item.price),
            line_total: parseFloat(item.line_total ?? item.total),
            total: parseFloat(item.line_total ?? item.total),
            line_discount: item.line_discount ?? item.discount_total,
            discount_total: item.discount_total,
          })),
          total: parseFloat(dataToPrint.totals?.total || 0),
          subtotal: parseFloat(dataToPrint.totals?.subtotal || 0),
          discount: orderDiscount,
          order_discount_total: orderDiscount,
          company: dataToPrint.company?.name || "",
          payment: dataToPrint.payment || {},
        };
        await handleCheckoutResponseForPrinting(printData, {
          receiptStyle: "market",
        });
      } else {
        throw new Error(t("crm.cashier.receiptPreview.noPrintData"));
      }
      onClose();
    } catch (printError: any) {
      console.error("Ошибка при печати чека:", printError);
      alert(
        t("crm.cashier.receiptPreview.printError", {
          message:
            printError.message ||
            t("crm.cashier.cartAlerts.unknownError"),
        })
      );
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptData && !receiptId) return;

    setDownloadingPdf(true);
    try {
      let dataToDownload = receiptData;

      // Если данных нет, загружаем их заново
      if (!dataToDownload && receiptId) {
        const result = await dispatch((getReceiptJson(receiptId) as any));
        if (result.type === "products/getReceiptJson/fulfilled") {
          dataToDownload = result.payload;
          setReceiptData(result.payload);
        } else {
          throw new Error(t("crm.cashier.receiptPreview.downloadDataLoadFailed"));
        }
      }

      if (!dataToDownload) {
        throw new Error(t("crm.cashier.receiptPreview.noPdfData"));
      }

      // Генерируем PDF из JSON используя ReceiptPdfDocument
      const blob = await pdf(
        <ReceiptPdfDocument data={dataToDownload} />
      ).toBlob();

      const doc = dataToDownload?.document || dataToDownload?.sale || {};
      const fileName = `receipt_${doc.number || doc.doc_no || receiptId}.pdf`;

      // Скачиваем файл
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (downloadError: any) {
      console.error("Ошибка при скачивании PDF:", downloadError);
      alert(
        t("crm.cashier.receiptPreview.pdfDownloadError", {
          message:
            downloadError.message ||
            t("crm.cashier.cartAlerts.unknownError"),
        })
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const _formatDateTime = (dateString: any) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatMoney = (amount: any) => {
    return parseFloat(amount || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const resolveMarketPreviewItem = (item: any) => {
    const mapped = mapMarketReceiptItem(item);
    return {
      id: item.id,
      name: mapped.name,
      qty: mapped.qty,
      price: mapped.price,
      lineDiscount: Math.max(0, mapped.line_discount_amount),
      total: mapped.total,
    };
  };

  const formatLineDiscountDisplay = (amt: any) => {
    const n = parseFloat(amt) || 0;
    if (n <= 0) return "0";
    return formatMoney(n);
  };

  if (loading) {
    return (
      <ReactPortal wrapperId="documents-receipt-preview-modal">
        <div className="receipt-preview-modal-overlay" onClick={onClose}>
          <div
            className="receipt-preview-modal"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="receipt-preview-modal__loading">{t("crm.cashier.receiptPreview.loading")}</div>
          </div>
        </div>
      </ReactPortal>
    );
  }

  if (error || !receiptData) {
    return (
      <ReactPortal wrapperId="documents-receipt-preview-modal">
        <div className="receipt-preview-modal-overlay" onClick={onClose}>
          <div
            className="receipt-preview-modal"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="receipt-preview-modal__error">
              {error || t("crm.cashier.receiptPreview.notFound")}
            </div>
            <div className="receipt-preview-modal__actions">
              <button
                className="receipt-preview-modal__close-btn"
                onClick={onClose}
              >
                {t("crm.cashier.receiptPreview.close")}
              </button>
            </div>
          </div>
        </div>
      </ReactPortal>
    );
  }

  // Нормализация позиций (скидки — как на печати маркета)
  const items = Array.isArray(receiptData?.items)
    ? receiptData.items.map(resolveMarketPreviewItem)
    : [];

  const doc = receiptData?.document || receiptData?.sale || {};
  const company = receiptData?.company || {};
  const cashier = receiptData?.cashier || {};
  const client = receiptData?.client || null;

  const itemsSubtotal = items.reduce((sum: any, it: any) => sum + (it.total || 0), 0);
  const subtotal =
    parseFloat(receiptData?.totals?.subtotal || 0) || itemsSubtotal;
  const discount = parseFloat(receiptData?.totals?.discount_total || 0);
  const tax = parseFloat(receiptData?.totals?.tax_total || 0);
  const total =
    parseFloat(receiptData?.totals?.total || 0) ||
    Math.max(0, subtotal - discount + tax);

  const payment = receiptData?.payment || {};
  const paidCash =
    payment.method === "cash" ? parseFloat(payment.cash_received || 0) : 0;
  const paidCard = payment.method === "card" ? parseFloat((total as any)) : 0;
  const change = parseFloat(payment.change || 0);

  return (
    <ReactPortal wrapperId="documents-receipt-preview-modal">
      <div className="receipt-preview-modal-overlay" onClick={onClose}>
        <div
          className="receipt-preview-modal"
          onClick={(e: any) => e.stopPropagation()}
        >
        <div className="receipt-preview-modal__header">
          <h2 className="receipt-preview-modal__title">
            {t("crm.cashier.receiptPreview.title")}
          </h2>
          <button className="receipt-preview-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="receipt-preview-modal__content">
          <div className="receipt-preview-modal__receipt">
            {/* Дата и время создания */}
            <div className="receipt-preview-modal__created-date">
              {formatDate(new Date().toISOString())}
            </div>

            {/* Заголовок чека */}
            <div className="receipt-preview-modal__receipt-header">
              <div className="receipt-preview-modal__doc-title">
                {t("crm.cashier.receiptPreview.docTitleWithDate", {
                  number: doc.number || doc.doc_no || "",
                  date: formatDate(doc.date || doc.created_at),
                })}
              </div>
            </div>

            {/* Информация о продавце */}
            <div className="receipt-preview-modal__company-info">
              <div className="receipt-preview-modal__company-name">
                {company?.name || "market"}
              </div>
              {company?.address && (
                <div className="receipt-preview-modal__company-address">
                  {company.address}
                </div>
              )}
            </div>

            {/* Позиции — как на чеке маркета */}
            <div className="receipt-preview-modal__items">
              {items.length > 0 ? (
                <>
                  <div className="receipt-preview-modal__item-row receipt-preview-modal__item-row--head">
                    <span className="receipt-preview-modal__item-price">
                      {t("crm.cashier.receiptPreview.itemsHeaderPrice")}
                    </span>
                    <span className="receipt-preview-modal__item-total">{t("crm.cashier.receiptPreview.itemsHeaderTotal")}</span>
                  </div>
                  {items.map((item: any, index: any) => (
                  <div
                    key={item.id || index}
                    className="receipt-preview-modal__items-table-item"
                  >
                    <div className="receipt-preview-modal__item-name">
                      {index + 1}) {item.name}
                    </div>
                    <div className="receipt-preview-modal__item-row">
                      <span className="receipt-preview-modal__item-price">
                        {formatMoney(item.price)} x {item.qty}
                        {item.lineDiscount > 0 &&
                          ` - ${formatLineDiscountDisplay(item.lineDiscount)}`}
                      </span>
                      <span className="receipt-preview-modal__item-total">
                        {formatMoney(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
                </>
              ) : (
                <div className="receipt-preview-modal__item">
                  <div className="receipt-preview-modal__item-name">
                    {t("crm.cashier.receiptPreview.noItems")}
                  </div>
                </div>
              )}
            </div>

            <div className="receipt-preview-modal__divider receipt-preview-modal__divider--dashed" />

            <div className="receipt-preview-modal__receipt-totals">
              <div className="receipt-preview-modal__total-row">
                <span>{t("crm.cashier.receiptPreview.subtotalPlain")}</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="receipt-preview-modal__total-row">
                  <span>{t("crm.cashier.receiptPreview.discountPlain")}</span>
                  <span>-{formatMoney(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="receipt-preview-modal__total-row">
                  <span>{t("crm.cashier.receiptPreview.taxNds")}</span>
                  <span>{formatMoney(tax)}</span>
                </div>
              )}
            </div>

            <div className="receipt-preview-modal__divider receipt-preview-modal__divider--dashed" />

            <div className="receipt-preview-modal__total-section">
              <div className="receipt-preview-modal__total-label">{t("crm.cashier.receiptPreview.totalPlain")}</div>
              <div className="receipt-preview-modal__total-amount">
                {formatMoney(total)}
              </div>
            </div>

            {/* Информация о кассире и клиенте */}
            {(cashier?.name || client?.full_name) && (
              <div className="receipt-preview-modal__receipt-info">
                {cashier?.name && (
                  <div className="receipt-preview-modal__info-row">
                    <span>{t("crm.cashier.receiptPreview.cashierLabel")}</span>
                    <span>{cashier.name}</span>
                  </div>
                )}
                {client?.full_name && (
                  <div className="receipt-preview-modal__info-row">
                    <span>{t("crm.cashier.receiptPreview.buyerLabel")}</span>
                    <span>{client.full_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Оплата */}
            {(paidCash > 0 || paidCard > 0 || change > 0) && (
              <>
                <div className="receipt-preview-modal__divider"></div>
                <div className="receipt-preview-modal__receipt-payment">
                  {paidCash > 0 && (
                    <div className="receipt-preview-modal__payment-row">
                      <span>{t("crm.cashier.receiptPreview.cashLabel")}</span>
                      <span>{formatMoney(paidCash)}</span>
                    </div>
                  )}
                  {paidCard > 0 && (
                    <div className="receipt-preview-modal__payment-row">
                      <span>{t("crm.cashier.receiptPreview.cardLabel")}</span>
                      <span>{formatMoney(paidCard)}</span>
                    </div>
                  )}
                  {change > 0 && (
                    <div className="receipt-preview-modal__payment-row">
                      <span>{t("crm.cashier.receiptPreview.changeLabel")}</span>
                      <span>{formatMoney(change)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Футер чека */}
            <div className="receipt-preview-modal__receipt-footer">
              <div className="receipt-preview-modal__divider"></div>
              <div className="receipt-preview-modal__thank-you">
                {t("crm.cashier.receiptPreview.thankYou")}
              </div>
            </div>
          </div>
        </div>

        <div className="receipt-preview-modal__actions">
          <button
            className="receipt-preview-modal__download-btn"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            <Download size={20} />
            {downloadingPdf ? t("crm.cashier.receiptPreview.downloading") : t("crm.cashier.receiptPreview.downloadPdf")}
          </button>
          <button
            className="receipt-preview-modal__print-btn"
            onClick={handlePrint}
            disabled={printing}
          >
            <Printer size={20} />
            {printing ? t("crm.cashier.receiptPreview.printing") : t("crm.cashier.receiptPreview.print")}
          </button>
          <button
            className="receipt-preview-modal__close-btn"
            onClick={onClose}
          >
            {t("crm.cashier.receiptPreview.close")}
          </button>
        </div>
      </div>
      </div>
    </ReactPortal>
  );
};

export default ReceiptPreviewModal;
