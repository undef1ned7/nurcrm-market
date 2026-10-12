import { useState, useEffect, useCallback } from "react";
import { X, Plus, Printer } from "lucide-react";
import { useDispatch } from "react-redux";
import {
  updateSellProduct,
  historySellProductDetail,
  getReceiptJson,
  getProductInvoice,
} from "@entities/sale";
import {
  handleCheckoutResponseForPrinting,
  checkPrinterConnection,
} from "@pages/sell/ui/services/printService";
import api from "@shared/api";
import "./ReceiptEditModal.scss";

const ReceiptEditModal = ({
  receiptId,
  receiptData: initialReceiptData,
  documentType = "receipt",
  onClose,
  onSaved,
}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<any>(false);
  const [printing, setPrinting] = useState<any>(false);
  const [error, setError] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    created_at: "",
    client: "",
    items: [],
    note: "",
  });

  // Вспомогательная функция для скачивания blob
  const downloadBlob = (blob: any, filename: any) => {
    if (typeof window === "undefined" || !window.URL || !window.document) {
      throw new Error("Браузерное окружение недоступно");
    }
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const loadReceiptData = (data: any) => {
    const date = data.created_at
      ? new Date(data.created_at).toISOString().split("T")[0]
      : "";
    const items = (data.items || []).map((item: any) => ({
      name: item.name || item.title || item.product_name || "",
      qty: item.qty || item.quantity || 1,
      price: item.price || item.unit_price || 0,
      total:
        (item.qty || item.quantity || 1) * (item.price || item.unit_price || 0),
    }));
    setFormData({
      code: data.code || "",
      created_at: date,
      client: data.client?.id || data.client || "",
      items: items,
      note: data.note || "",
    });
  };

  const loadReceiptFromId = useCallback(async () => {
    try {
      setLoading(true);
      const result = await dispatch((historySellProductDetail(receiptId) as any));
      if (historySellProductDetail.fulfilled.match(result)) {
        loadReceiptData(result.payload);
      }
    } catch (err: any) {
      console.error("Ошибка загрузки чека:", err);
      setError("Не удалось загрузить данные чека");
    } finally {
      setLoading(false);
    }
  }, [dispatch, receiptId]);

  useEffect(() => {
    loadClients();
    if (initialReceiptData) {
      loadReceiptData(initialReceiptData);
    } else if (receiptId) {
      loadReceiptFromId();
    }
  }, [initialReceiptData, receiptId, loadReceiptFromId]);

  const loadClients = async () => {
    try {
      const res = await api.get("/main/clients/");
      const list = Array.isArray(res?.data?.results)
        ? res.data.results
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setClients(list);
    } catch (e: any) {
      console.error("Ошибка при загрузке клиентов:", e);
    }
  };

  const handleChange = (field: any, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: any, field: any, value: any) => {
    setFormData((prev: any) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      // Пересчитываем сумму
      if (field === "qty" || field === "price") {
        const qty = parseFloat(newItems[index].qty || 0);
        const price = parseFloat(newItems[index].price || 0);
        newItems[index].total = (qty * price).toFixed(2);
      }
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name: "",
          qty: 1,
          price: 0,
          total: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: any) => {
    setFormData((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: any) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        code: formData.code,
        created_at: formData.created_at,
        client: formData.client || null,
        items: formData.items.map((item: any) => ({
          name: item.name,
          qty: parseFloat(item.qty || 0),
          price: parseFloat(item.price || 0),
        })),
        note: formData.note,
      };

      const result = await dispatch(
        (updateSellProduct({ updatedData: payload, id: receiptId }) as any)
      );

      if (updateSellProduct.fulfilled.match(result)) {
        onSaved?.(result.payload);
        onClose();
      } else {
        setError(result.payload?.detail || "Не удалось сохранить изменения");
      }
    } catch (err: any) {
      console.error("Ошибка сохранения:", err);
      setError("Не удалось сохранить изменения");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!receiptId) return;

    setPrinting(true);
    try {
      if (documentType === "invoice") {
        // Для накладной используем PDF endpoint
        const result = await dispatch((getProductInvoice(receiptId) as any));
        if (getProductInvoice.fulfilled.match(result)) {
          const pdfBlob = result.payload;

          if (pdfBlob instanceof Blob) {
            // Убеждаемся, что blob имеет правильный MIME type
            const blob =
              pdfBlob.type === "application/pdf"
                ? pdfBlob
                : new Blob([pdfBlob], { type: "application/pdf" });

            // Скачиваем файл используя вспомогательную функцию
            downloadBlob(blob, `invoice_${receiptId}.pdf`);
          } else {
            throw new Error("Получен неверный формат PDF");
          }
        } else {
          throw new Error("Не удалось загрузить PDF накладной");
        }
      } else {
        // Для чека используем обычную печать через принтер
        const isPrinterConnected = await checkPrinterConnection();

        if (!isPrinterConnected) {
          alert(
            "Принтер не подключен. Пожалуйста, подключите принтер перед печатью."
          );
          return;
        }

        const result = await dispatch((getReceiptJson(receiptId) as any));
        if (result.type === "products/getReceiptJson/fulfilled") {
          const documentData = result.payload;

          if (documentData && Array.isArray((documentData as any).items)) {
            // Преобразуем данные в формат для печати
            const printData = {
              items: (documentData as any).items.map((item: any) => ({
                name: item.name,
                qty: parseFloat(item.qty),
                price: parseFloat(item.unit_price),
                total: parseFloat(item.total),
              })),
              total: parseFloat((documentData as any).totals?.total || 0),
              subtotal: parseFloat((documentData as any).totals?.subtotal || 0),
              discount_total: parseFloat(
                (documentData as any).totals?.discount_total || 0
              ),
              company: (documentData as any).company?.name || "",
              payment: (documentData as any).payment || {},
            };
            await handleCheckoutResponseForPrinting(printData, {
              receiptStyle: "market",
            });
          } else {
            throw new Error("Нет данных для печати");
          }
        } else {
          throw new Error("Не удалось загрузить данные чека для печати");
        }
      }
    } catch (printError: any) {
      console.error("Ошибка при печати:", printError);
      alert(
        "Ошибка при печати: " + (printError.message || "Неизвестная ошибка")
      );
    } finally {
      setPrinting(false);
    }
  };

  const formatMoney = (amount: any) => {
    return parseFloat(amount || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="receipt-edit-modal-overlay" onClick={onClose}>
      <div className="receipt-edit-modal" onClick={(e: any) => e.stopPropagation()}>
        <div className="receipt-edit-modal__header">
          <h2 className="receipt-edit-modal__title">
            Редактирование документа
          </h2>
          <button className="receipt-edit-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="receipt-edit-modal__content">
          {error && <div className="receipt-edit-modal__error">{error}</div>}

          <div className="receipt-edit-modal__form-row">
            <div className="receipt-edit-modal__form-group">
              <label className="receipt-edit-modal__label">
                Номер документа
              </label>
              <input
                type="text"
                className="receipt-edit-modal__input"
                value={formData.code}
                onChange={(e: any) => handleChange("code", e.target.value)}
              />
            </div>
            <div className="receipt-edit-modal__form-group">
              <label className="receipt-edit-modal__label">Дата</label>
              <input
                type="date"
                className="receipt-edit-modal__input"
                value={formData.created_at}
                onChange={(e: any) => handleChange("created_at", e.target.value)}
              />
            </div>
          </div>

          <div className="receipt-edit-modal__form-group">
            <label className="receipt-edit-modal__label">Клиент</label>
            <select
              className="receipt-edit-modal__input"
              value={formData.client}
              onChange={(e: any) => handleChange("client", e.target.value)}
            >
              <option value="">Выберите клиента</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.full_name ||
                    client.fio ||
                    client.name ||
                    `Клиент ${client.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="receipt-edit-modal__form-group">
            <label className="receipt-edit-modal__label">Товары</label>
            <table className="receipt-edit-modal__items-table">
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Кол-во</th>
                  <th>Цена</th>
                  <th>Сумма</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item: any, index: any) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        className="receipt-edit-modal__item-input"
                        value={item.name}
                        onChange={(e: any) =>
                          handleItemChange(index, "name", e.target.value)
                        }
                        placeholder="Наименование"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="receipt-edit-modal__item-input"
                        value={item.qty}
                        onChange={(e: any) =>
                          handleItemChange(index, "qty", e.target.value)
                        }
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="receipt-edit-modal__item-input"
                        value={item.price}
                        onChange={(e: any) =>
                          handleItemChange(index, "price", e.target.value)
                        }
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>{formatMoney(item.total)}</td>
                    <td>
                      <button
                        type="button"
                        className="receipt-edit-modal__remove-btn"
                        onClick={() => handleRemoveItem(index)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="receipt-edit-modal__add-btn"
              onClick={handleAddItem}
            >
              <Plus size={18} />
              Добавить товар
            </button>
          </div>

          <div className="receipt-edit-modal__form-group">
            <label className="receipt-edit-modal__label">Комментарий</label>
            <textarea
              className="receipt-edit-modal__textarea"
              value={formData.note}
              onChange={(e: any) => handleChange("note", e.target.value)}
              placeholder="Дополнительная информация..."
              rows={4}
            />
          </div>
        </div>

        <div className="receipt-edit-modal__actions">
          <button className="receipt-edit-modal__cancel-btn" onClick={onClose}>
            Отменить
          </button>
          <button
            className="receipt-edit-modal__print-btn"
            onClick={handlePrint}
            disabled={printing || !receiptId}
          >
            <Printer size={18} />
            {printing
              ? "Печать..."
              : documentType === "invoice"
              ? "Печать накладной"
              : "Печать чека"}
          </button>
          <button
            className="receipt-edit-modal__save-btn"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptEditModal;
