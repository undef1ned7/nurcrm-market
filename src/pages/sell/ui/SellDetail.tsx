import { FileText, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";

import {
  getProductCheckout,
  getInvoiceJson,
  historySellObjectDetail,
  historySellProductDetail,
} from "@entities/sale";
import { useSale } from "@entities/sale";
import { useUser } from "@entities/user";
import InvoicePdfDocument from "@pages/documents/ui/components/InvoicePdfDocument";
import { handleCheckoutResponseForPrinting as printViaSharedService } from "./services/printService";
import Modal from "@shared/ui/Modal/Modal";

/* ============================================================
   A) WebUSB helpers (autoconnect)
   ============================================================ */

const usbState: any = { dev: null, opening: null };

async function tryUsbAutoConnect() {
  if (!("usb" in navigator)) throw new Error("Браузер не поддерживает WebUSB");
  const savedVid = parseInt(localStorage.getItem("escpos_vid") || "", 16);
  const savedPid = parseInt(localStorage.getItem("escpos_pid") || "", 16);
  const navUsb = (navigator as any).usb;
  const devs = await navUsb.getDevices();
  return (
    devs.find(
      (d: any) =>
        (!savedVid || d.vendorId === savedVid) &&
        (!savedPid || d.productId === savedPid)
    ) || null
  );
}

async function openUsbDevice(dev: any) {
  if (!dev) throw new Error("USB устройство не найдено");
  if (!dev.opened) await dev.open();
  if (dev.configuration == null) {
    await dev.selectConfiguration(1).catch(() => {});
    if (dev.configuration == null && dev.configurations?.length) {
      const cfgNum = dev.configurations[0]?.configurationValue ?? 1;
      await dev.selectConfiguration(cfgNum).catch(() => {});
    }
  }
  const cfg = dev.configuration;
  if (!cfg) throw new Error("USB configuration not selected");
  for (const iface of cfg.interfaces) {
    for (const alt of iface.alternates) {
      const outEP = alt.endpoints.find((e: any) => e.direction === "out" && e.type === "bulk");
      if (outEP) {
        await dev.claimInterface(iface.interfaceNumber).catch(() => {});
        return { outEP: outEP.endpointNumber };
      }
    }
  }
  throw new Error(
    "Не удалось захватить интерфейс с bulk OUT. На Windows установите WinUSB (Zadig) и закройте другие приложения принтера."
  );
}

async function ensureUsbReadyAuto() {
  if (!("usb" in navigator)) throw new Error("WebUSB не поддерживается");
  if (usbState.dev) return usbState;
  if (!usbState.opening) {
    usbState.opening = (async () => {
      const dev = await tryUsbAutoConnect();
      if (!dev) return null;
      await openUsbDevice(dev);
      usbState.dev = dev;
      return usbState;
    })().finally(() => (usbState.opening = null));
  }
  await usbState.opening;
  return usbState.dev ? usbState : null;
}

function attachUsbListenersOnce() {
  if (!("usb" in navigator)) return;
  if ((attachUsbListenersOnce as any)._did) return;
  (attachUsbListenersOnce as any)._did = true;

  const navUsb = (navigator as any).usb;
  navUsb.addEventListener("connect", async (e: any) => {
    try {
      const savedVid = parseInt(localStorage.getItem("escpos_vid") || "", 16);
      const savedPid = parseInt(localStorage.getItem("escpos_pid") || "", 16);
      if (!savedVid || !savedPid) return;
      if (e.device.vendorId !== savedVid || e.device.productId !== savedPid)
        return;
      await openUsbDevice(e.device);
      usbState.dev = e.device;
    } catch (err: any) {
      console.warn("USB auto-connect failed:", err);
    }
  });

  navUsb.addEventListener("disconnect", (e: any) => {
    if (usbState.dev && e.device === usbState.dev) {
      usbState.dev = null;
    }
  });
}

async function handleCheckoutResponseForPrinting(res: any) {
  await printViaSharedService(res);
}


/* ============================================================
   B) Компонент SellDetail
   ============================================================ */

const STATUS_KEY: Record<string, string> = {
  new: "statusNew",
  paid: "statusPaid",
  canceled: "statusCanceled",
  partially_returned: "statusPartiallyReturned",
  debt: "statusDebt",
};

const formatMoney = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDateTime = (dateString: any) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateString);
  }
};

const getStatusVariant = (status: any) => {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "canceled" || s === "cancelled") return "canceled";
  if (s === "partially_returned") return "canceled";
  if (s === "debt") return "debt";
  return "new";
};

const getLineDiscount = (product: any) =>
  Number(
    product?.line_discount ??
      product?.line_discount_total ??
      product?.discount_amount ??
      product?.discount_total ??
      0,
  );

const getLineTotal = (product: any) => {
  const qty = Number(product?.quantity || 0);
  const unitPrice = Number(product?.unit_price || 0);
  const discount = getLineDiscount(product);
  const computed = qty * unitPrice - discount;
  const explicit = Number(product?.line_total);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Math.max(0, computed);
};

const SellDetail = ({ onClose: onCloseProp, id: idProp }: any) => {
  const { t } = useTranslation();
  const ts = (k: string): string =>
    t(`crm.sell.modals.saleDetail.${k}`) as string;
  const dispatch = useDispatch() as any;
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const id = idProp || routeId;
  const onClose = onCloseProp || (() => navigate(-1));
  const { historyDetail: item, historyObjectDetail } = useSale() as any;
  const { company } = useUser() as any;
  const [loading, setLoading] = useState(true);

  const sectorName = company?.sector?.name?.trim().toLowerCase() ?? "";
  const planName = company?.subscription_plan?.name?.trim().toLowerCase() ?? "";
  const isBuildingCompany = sectorName === "строительная компания";
  const isStartPlan = planName === "старт";

  const filterField = isStartPlan
    ? item
    : isBuildingCompany
    ? historyObjectDetail
    : item;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const requests = [dispatch(historySellProductDetail(id))];
    if (isBuildingCompany) {
      requests.push(dispatch(historySellObjectDetail(id)));
    }

    Promise.all(requests).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, dispatch, isBuildingCompany]);

  // Автоподключение USB при монтировании
  useEffect(() => {
    attachUsbListenersOnce();
    ensureUsbReadyAuto().catch(() => {});
  }, []);

  const handlePrintReceipt = async () => {
    try {
      const res = await dispatch(getProductCheckout(item?.id)).unwrap();
      await handleCheckoutResponseForPrinting(res);
    } catch (e: any) {
      console.error("Печать чека не удалась:", e);
      alert(ts("errPrint"));
    }
  };

  const handleDownloadInvoice = async () => {
    if (!item?.id) {
      alert(ts("errSaleId"));
      return;
    }

    try {
      // Получаем JSON данные накладной
      const result = await dispatch(getInvoiceJson(item.id));
      if (getInvoiceJson.fulfilled.match(result)) {
        const invoiceData = result.payload;

        if (!invoiceData) {
          throw new Error("Нет данных для генерации PDF");
        }

        // Генерируем PDF из JSON используя InvoicePdfDocument
        const blob = await pdf(
          <InvoicePdfDocument data={invoiceData} />
        ).toBlob();

        const fileName = `invoice_${
          invoiceData?.document?.number || item.id
        }.pdf`;

        // Скачиваем файл
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        throw new Error("Не удалось загрузить данные накладной");
      }
    } catch (err: any) {
      console.error("Скачивание накладной не удалось:", err);
      alert(err?.message || err?.detail || ts("errInvoice"));
    }
  };

  const statusVariant = getStatusVariant(filterField?.status);
  const statusKey = STATUS_KEY[filterField?.status as string];
  const statusLabel = statusKey
    ? ts(statusKey)
    : filterField?.status || "—";
  const items = Array.isArray(filterField?.items) ? filterField.items : [];
  const subtotal = Number(filterField?.subtotal || 0);
  const discountTotal = Number(filterField?.discount_total || 0);
  const taxTotal = Number(filterField?.tax_total || 0);
  const total = Number(filterField?.total || 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={ts("title")}
      className="sellDetailModal"
      contentClassName="sellDetailModal__content"
      wrapperId="sell-detail-modal"
    >
      <div className="sellDetail">
        {loading ? (
          <div className="sellDetail__loading">{ts("loading")}</div>
        ) : (
          <>
            <div className="sellDetail__meta">
              <div className="sellDetail__metaCard">
                <span className="sellDetail__metaLabel">{ts("client")}</span>
                <span className="sellDetail__metaValue">
                  {filterField?.client_name || ts("noClient")}
                </span>
              </div>
              <div className="sellDetail__metaCard">
                <span className="sellDetail__metaLabel">{ts("status")}</span>
                <span className={`sellBadge sellBadge--${statusVariant}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="sellDetail__metaCard">
                <span className="sellDetail__metaLabel">{ts("date")}</span>
                <span className="sellDetail__metaValue">
                  {formatDateTime(filterField?.created_at)}
                </span>
              </div>
              <div className="sellDetail__metaCard">
                <span className="sellDetail__metaLabel">{ts("cashier")}</span>
                <span className="sellDetail__metaValue">
                  {filterField?.user_display ||
                    filterField?.cashier_name ||
                    filterField?.user_name ||
                    "—"}
                </span>
              </div>
              {filterField?.cashbox_name && (
                <div className="sellDetail__metaCard">
                  <span className="sellDetail__metaLabel">{ts("cashbox")}</span>
                  <span className="sellDetail__metaValue">
                    {filterField.cashbox_name}
                  </span>
                </div>
              )}
            </div>

            <section
              className="sellDetail__section"
              aria-label={ts("positionsAria")}
            >
              <h4 className="sellDetail__sectionTitle">
                {ts("positions")}
                <span className="sellDetail__sectionCount">{items.length}</span>
              </h4>

              {items.length === 0 ? (
                <div className="sellDetail__empty">{ts("noPositions")}</div>
              ) : (
                <div className="sellDetail__items">
                  <div className="sellDetail__itemsHead" aria-hidden>
                    <span>{ts("colProduct")}</span>
                    <span>{ts("colQty")}</span>
                    <span>{ts("colPrice")}</span>
                    <span>{ts("colSum")}</span>
                  </div>
                  {items.map((product: any, idx: any) => {
                    const name =
                      product.product_name ?? product.object_name ?? "—";
                    const qty = Number(product.quantity || 0);
                    const unitPrice = Number(product.unit_price || 0);
                    const lineDiscount = getLineDiscount(product);
                    const lineTotal = getLineTotal(product);

                    return (
                      <div className="sellDetail__item" key={product.id ?? idx}>
                        <div className="sellDetail__itemName">
                          <span className="sellDetail__itemNo">{idx + 1}</span>
                          <span>{name}</span>
                        </div>
                        <div className="sellDetail__itemQty">
                          {qty.toLocaleString("ru-RU", {
                            maximumFractionDigits: 3,
                          })}
                        </div>
                        <div className="sellDetail__itemPrice">
                          {formatMoney(unitPrice)}
                        </div>
                        <div className="sellDetail__itemTotal">
                          <strong>{formatMoney(lineTotal)}</strong>
                          {lineDiscount > 0 && (
                            <span className="sellDetail__itemDiscount">
                              −{formatMoney(lineDiscount)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section
              className="sellDetail__totals"
              aria-label={ts("totalsAria")}
            >
              <div className="sellDetail__totalRow">
                <span>{ts("subtotal")}</span>
                <span>{formatMoney(subtotal)} сом</span>
              </div>
              {discountTotal > 0 && (
                <div className="sellDetail__totalRow sellDetail__totalRow--discount">
                  <span>{ts("discount")}</span>
                  <span>−{formatMoney(discountTotal)} сом</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="sellDetail__totalRow">
                  <span>{ts("tax")}</span>
                  <span>{formatMoney(taxTotal)} сом</span>
                </div>
              )}
              <div className="sellDetail__totalRow sellDetail__totalRow--final">
                <span>{ts("grandTotal")}</span>
                <strong>{formatMoney(total)} сом</strong>
              </div>
            </section>

            <div className="sellDetail__actions">
              <button
                type="button"
                className="sellDetail__actionBtn sellDetail__actionBtn--primary"
                onClick={handlePrintReceipt}
              >
                <Receipt size={18} strokeWidth={2.2} aria-hidden />
                {ts("printReceipt")}
              </button>
              <button
                type="button"
                className="sellDetail__actionBtn sellDetail__actionBtn--secondary"
                onClick={handleDownloadInvoice}
              >
                <FileText size={18} strokeWidth={2.2} aria-hidden />
                {ts("downloadInvoice")}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SellDetail;
