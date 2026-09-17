import { useState, useEffect } from "react";
import { X, Printer } from "lucide-react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { getReceiptJson, receiptConsultantName } from "@entities/sale";
import {
  handleCheckoutResponseForPrinting,
  checkPrinterConnection,
  mapMarketReceiptItem,
} from "@pages/sell/ui/services/printService";
import "./ReceiptPreviewModal.scss";

const ReceiptPreviewModal = ({ receiptId, receiptData: initialReceiptData, onClose, onPrintSuccess }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const [receiptData, setReceiptData] = useState(initialReceiptData);
  const [loading, setLoading] = useState(!initialReceiptData);
  const [printing, setPrinting] = useState(false);
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
        const result = await dispatch(getReceiptJson(receiptId));
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
        const result = await dispatch(getReceiptJson(receiptId));
        if (result.type === "products/getReceiptJson/fulfilled") {
          dataToPrint = result.payload;
        } else {
          throw new Error(t("crm.cashier.receiptPreview.printDataLoadFailed"));
        }
      }

      if (dataToPrint && Array.isArray(dataToPrint.items)) {
        // Преобразуем данные в формат для печати
        const printData = {
          items: dataToPrint.items.map((item) => ({
            name: item.name,
            qty: parseFloat(String(item.qty)),
            price: parseFloat(String(item.unit_price)),
            total: parseFloat(String(item.total)),
          })),
          total: parseFloat(String(dataToPrint.totals?.total || 0)),
          subtotal: parseFloat(String(dataToPrint.totals?.subtotal || 0)),
          discount_total: parseFloat(String(dataToPrint.totals?.discount_total || 0)),
          company: dataToPrint.company?.name || "",
          payment: dataToPrint.payment || {},
          consultant_name:
            receiptConsultantName(dataToPrint) ||
            receiptConsultantName(dataToPrint?.sale),
        };
        await handleCheckoutResponseForPrinting(printData, {
          receiptStyle: "market",
        });
      } else {
        throw new Error(t("crm.cashier.receiptPreview.noPrintData"));
      }

      if (onPrintSuccess) {
        onPrintSuccess();
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

  const formatDate = (dateString) => {
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

  const formatMoney = (amount) => {
    return parseFloat(String(amount || 0)).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="receipt-preview-modal-overlay" onClick={onClose}>
        <div className="receipt-preview-modal" onClick={(e: any) => e.stopPropagation()}>
          <div className="receipt-preview-modal__loading">{t("crm.cashier.receiptPreview.loading")}</div>
        </div>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="receipt-preview-modal-overlay" onClick={onClose}>
        <div className="receipt-preview-modal" onClick={(e: any) => e.stopPropagation()}>
          <div className="receipt-preview-modal__error">
            {error || t("crm.cashier.receiptPreview.notFound")}
          </div>
          <div className="receipt-preview-modal__actions">
            <button className="receipt-preview-modal__close-btn" onClick={onClose}>
              {t("crm.cashier.receiptPreview.close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Нормализация данных из нового формата API
  const resolveMarketPreviewItem = (item) => {
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

  const formatLineDiscountDisplay = (amt) => {
    const n = parseFloat(String(amt)) || 0;
    if (n <= 0) return "0";
    return formatMoney(n);
  };

  const items = Array.isArray(receiptData?.items)
    ? receiptData.items.map(resolveMarketPreviewItem)
    : [];
  const consultantName =
    receiptConsultantName(receiptData) ||
    receiptConsultantName(receiptData?.sale);

  const subtotal = parseFloat(String(receiptData?.totals?.subtotal || 0));
  const discount = parseFloat(String(receiptData?.totals?.discount_total || 0));
  const tax = parseFloat(String(receiptData?.totals?.tax_total || 0));
  const total = parseFloat(String(receiptData?.totals?.total || 0));
  
  const payment = receiptData?.payment || {};
  const paidCash = payment.method === "cash" ? parseFloat(String(payment.cash_received || 0)) : 0;
  const paidCard = payment.method === "card" ? parseFloat(String(total)) : 0;
  const change = parseFloat(String(payment.change || 0));

  return (
    <div className="receipt-preview-modal-overlay" onClick={onClose}>
      <div className="receipt-preview-modal" onClick={(e: any) => e.stopPropagation()}>
        <div className="receipt-preview-modal__header">
          <h2 className="receipt-preview-modal__title">{t("crm.cashier.receiptPreview.title")}</h2>
          <button className="receipt-preview-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="receipt-preview-modal__content">
          <div className="receipt-preview-modal__receipt">
            {/* Заголовок чека */}
            <div className="receipt-preview-modal__receipt-header">
              {receiptData?.company?.name && (
                <div className="receipt-preview-modal__company">
                  {receiptData.company.name}
                </div>
              )}
              {receiptData?.sale?.doc_no && (
                <div className="receipt-preview-modal__doc-no">
                  {t("crm.cashier.receiptPreview.docNo", { number: receiptData.sale.doc_no })}
                </div>
              )}
              <div className="receipt-preview-modal__divider"></div>
            </div>

            {/* Информация о дате и кассире */}
            <div className="receipt-preview-modal__receipt-info">
              {receiptData?.sale?.created_at && (
                <div className="receipt-preview-modal__info-row">
                  <span>{t("crm.cashier.receiptPreview.dateLabel")}</span>
                  <span>{formatDate(receiptData.sale.created_at)}</span>
                </div>
              )}
              {receiptData?.cashier?.name && (
                <div className="receipt-preview-modal__info-row">
                  <span>{t("crm.cashier.receiptPreview.cashierLabel")}</span>
                  <span>{receiptData.cashier.name}</span>
                </div>
              )}
              {consultantName ? (
                <div className="receipt-preview-modal__info-row">
                  <span>{t("crm.cashier.receiptPreview.consultantLabel")}</span>
                  <span>{consultantName}</span>
                </div>
              ) : null}
              {receiptData?.client?.full_name && (
                <div className="receipt-preview-modal__info-row">
                  <span>{t("crm.cashier.receiptPreview.buyerLabel")}</span>
                  <span>{receiptData.client.full_name}</span>
                </div>
              )}
              <div className="receipt-preview-modal__divider"></div>
            </div>

            {/* Товары */}
            <div className="receipt-preview-modal__receipt-items">
              {items.length > 0 ? (
                <>
                  <div className="receipt-preview-modal__item-details receipt-preview-modal__item-details--head">
                    <span>{t("crm.cashier.receiptPreview.itemsHeaderPrice")}</span>
                    <span className="receipt-preview-modal__item-total">{t("crm.cashier.receiptPreview.itemsHeaderTotal")}</span>
                  </div>
                  {items.map((item, index) => (
                  <div key={item.id || index} className="receipt-preview-modal__item">
                    <div className="receipt-preview-modal__item-name">
                      {index + 1}) {item.name}
                    </div>
                    <div className="receipt-preview-modal__item-details">
                      <span>
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
                  <div className="receipt-preview-modal__item-name">{t("crm.cashier.receiptPreview.noItems")}</div>
                </div>
              )}
              <div className="receipt-preview-modal__divider"></div>
            </div>

            {/* Итоги */}
            <div className="receipt-preview-modal__receipt-totals">
              <div className="receipt-preview-modal__total-row">
                <span>{t("crm.cashier.receiptPreview.subtotalLabel")}</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="receipt-preview-modal__total-row">
                  <span>{t("crm.cashier.receiptPreview.discountLabel")}</span>
                  <span>-{formatMoney(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="receipt-preview-modal__total-row">
                  <span>{t("crm.cashier.receiptPreview.taxLabel")}</span>
                  <span>{formatMoney(tax)}</span>
                </div>
              )}
              <div className="receipt-preview-modal__divider"></div>
              <div className="receipt-preview-modal__total-row receipt-preview-modal__total-row--bold">
                <span>{t("crm.cashier.receiptPreview.totalLabel")}</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

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
            className="receipt-preview-modal__print-btn"
            onClick={handlePrint}
            disabled={printing}
          >
            <Printer size={20} />
            {printing ? t("crm.cashier.receiptPreview.printing") : t("crm.cashier.receiptPreview.print")}
          </button>
          <button className="receipt-preview-modal__close-btn" onClick={onClose}>
            {t("crm.cashier.receiptPreview.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreviewModal;

