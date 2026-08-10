import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  ClipboardList,
  Eye,
  Printer,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import {
  fetchDocuments,
  getReceiptJson,
  getInvoiceJson,
} from "@entities/sale";
import {
  handleCheckoutResponseForPrinting,
  checkPrinterConnection,
} from "@pages/sell/ui/services/printService";
import ReconciliationModal from "./components/ReconciliationModal";
import ReceiptPreviewModal from "./components/ReceiptPreviewModal";
import ReceiptEditModal from "./components/ReceiptEditModal";
import InvoicePreviewModal from "./components/InvoicePreviewModal";
import InvoicePdfDocument from "./components/InvoicePdfDocument";
import "./Documents.scss";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import InventorySessionsTab from "./components/InventorySessionsTab";
import {
  PageShell,
  PageHeader,
  PagePanel,
  FilterBar,
  StatusChip,
  EmptyState,
  LoadingState,
} from "@shared/ui/page-shell";

const Documents = () => {
  const alert = useAlert();
  const dispatch = useDispatch() as any;
  const navigate = useNavigate();
  const {
    documents,
    documentsCount,
    documentsNext,
    documentsPrevious,
    documentsLoading,
  } = useSelector((state: any) => state.sale);

  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);

  const activeTab = useMemo(() => {
    const t = searchParams.get("tab");
    if (t === "inventory") return "inventory";
    if (t === "invoices") return "invoices";
    return "receipts";
  }, [searchParams]);

  const setActiveTab = useCallback(
    (tab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (tab === "receipts") {
            p.delete("tab");
          } else {
            p.set("tab", tab);
          }
          if (tab === "inventory") {
            p.delete("page");
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(pageFromUrl || 1);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [previewReceiptId, setPreviewReceiptId] = useState<any>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<any>(null);
  const [editReceiptId, setEditReceiptId] = useState<any>(null);
  const [editReceiptData, setEditReceiptData] = useState<any>(null);
  const debounceTimerRef = useRef<any>(null);

  // Debounce для поиска
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Сбрасываем на первую страницу при изменении поиска
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Функция для генерации порядкового номера чека/накладной
  // Используем фиксированный размер страницы (обычно API возвращает 20 элементов)
  const PAGE_SIZE = 100;
  const getDocumentNumber = useCallback((index, prefix = "ЧЕК") => {
    const sequentialNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
    return `${prefix}-${String(sequentialNumber).padStart(5, "0")}`;
  }, [currentPage]);

  // Маппинг данных из Redux в формат для отображения
  const receiptsData = useMemo(() => {
    if (activeTab !== "receipts") return [];
    return (documents || []).map((sale, index) => ({
      id: sale.id,
      number: getDocumentNumber(index, "ЧЕК"),
      date: sale.created_at
        ? new Date(sale.created_at).toLocaleString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      client:
        sale.client?.full_name ||
        sale.client_name ||
        sale.client ||
        "Без клиента",
      products: sale.items?.length || 0,
      amount: sale.total || "0.00",
      status: sale.status === "paid" ? "Проведен" : "Черновик",
      statusType: sale.status === "paid" ? "approved" : "draft",
    }));
  }, [documents, activeTab, getDocumentNumber]);

  const invoicesData = useMemo(() => {
    if (activeTab !== "invoices") return [];
    return (documents || []).map((sale, index) => ({
      id: sale.id,
      number: getDocumentNumber(index, "НАКЛ"),
      date: sale.created_at
        ? new Date(sale.created_at).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
      counterparty:
        sale.client?.full_name ||
        sale.client_name ||
        sale.client ||
        "Без контрагента",
      positions: sale.items?.length || 0,
      amount: sale.total || "0.00",
      status: sale.status === "paid" ? "Проведен" : "Черновик",
      statusType: sale.status === "paid" ? "approved" : "draft",
    }));
  }, [documents, activeTab, getDocumentNumber]);

  // Обновление URL страницы для чеков/накладных, сохраняем tab=…
  useEffect(() => {
    if (activeTab !== "receipts" && activeTab !== "invoices") return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (currentPage > 1) p.set("page", String(currentPage));
        else p.delete("page");
        if (p.toString() === prev.toString()) return prev;
        return p;
      },
      { replace: true },
    );
  }, [currentPage, activeTab, setSearchParams]);

  // Сброс страницы при смене таба
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Загрузка данных через Redux при изменении таба, страницы или поиска
  useEffect(() => {
    if (activeTab === "receipts" || activeTab === "invoices") {
      dispatch(
        fetchDocuments({
          page: currentPage,
          search: debouncedSearchTerm,
        }),
      );
    }
  }, [dispatch, activeTab, currentPage, debouncedSearchTerm]);

  const getCurrentData = () => {
    switch (activeTab) {
      case "receipts":
        return receiptsData;
      case "invoices":
        return invoicesData;
      default:
        return [];
    }
  };

  const totalPages =
    documentsCount && PAGE_SIZE ? Math.ceil(documentsCount / PAGE_SIZE) : 1;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (totalPages && newPage > totalPages)) return;
    setCurrentPage(newPage);
  };

  const handleView = (item) => {
    if (activeTab === "receipts") {
      setPreviewReceiptId(item.id);
    } else if (activeTab === "invoices") {
      setPreviewInvoiceId(item.id);
    }
  };

  const _handleEdit = (item) => {
    setEditReceiptId(item.id);
    setEditReceiptData({
      ...item,
      documentType: activeTab === "invoices" ? "invoice" : "receipt",
    });
  };

  const handleEditFromPreview = (receiptData) => {
    setPreviewReceiptId(null);
    setPreviewInvoiceId(null);
    setEditReceiptId(receiptData.id);
    setEditReceiptData({
      ...receiptData,
      documentType: activeTab === "invoices" ? "invoice" : "receipt",
    });
  };

  const handleSaved = async () => {
    // Перезагружаем документы после сохранения
    if (activeTab === "receipts" || activeTab === "invoices") {
      try {
        await dispatch(
          fetchDocuments({
            page: currentPage,
            search: debouncedSearchTerm,
          }),
        ).unwrap();
      } catch (error: any) {
        const errorMessage = validateResErrors(
          error,
          "Ошибка при сохранении документа. ",
        );
        alert(errorMessage, true);
      }
    }
  };

  const handlePrint = async (item) => {
    if (!item?.id) return;

    try {
      if (activeTab === "invoices") {
        // Для накладной получаем JSON данные и генерируем PDF через InvoicePdfDocument
        const result = await dispatch(getInvoiceJson(item.id));
        if (getInvoiceJson.fulfilled.match(result)) {
          const invoiceData = result.payload;

          if (!invoiceData) {
            throw new Error("Нет данных для генерации PDF");
          }

          // Генерируем PDF из JSON используя InvoicePdfDocument
          const blob = await pdf(
            <InvoicePdfDocument data={invoiceData} />,
          ).toBlob();

          const fileName = `invoice_${
            invoiceData?.document?.number || item.id
          }.pdf`;

          // Скачиваем файл
          const url = window.URL.createObjectURL(blob);
          const a = window.document.createElement("a");
          a.href = url;
          a.download = fileName;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } else {
          throw new Error("Не удалось загрузить данные накладной");
        }
      } else {
        // Для чека печатаем через USB принтер
        const isPrinterConnected = await checkPrinterConnection();

        if (!isPrinterConnected) {
          alert(
            "Принтер не подключен. Пожалуйста, подключите принтер перед печатью.",
            true,
          );
          return;
        }

        const result = await dispatch(getReceiptJson(item.id));
        if (result.type === "products/getReceiptJson/fulfilled") {
          const documentData = result.payload;

          if (documentData && Array.isArray(documentData.items)) {
            // Преобразуем данные в формат для печати
            const printData = {
              items: documentData.items.map((item) => ({
                name: item.name,
                qty: parseFloat(item.qty),
                price: parseFloat(item.unit_price),
                total: parseFloat(item.total),
              })),
              total: parseFloat(documentData.totals?.total || 0),
              subtotal: parseFloat(documentData.totals?.subtotal || 0),
              discount_total: parseFloat(
                documentData.totals?.discount_total || 0,
              ),
              company: documentData.company?.name || "",
              payment: documentData.payment || {},
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
    } catch (printError) {
      const errorMessage = validateResErrors(printError, "Ошибка при печати. ");
      alert(errorMessage, true);
    }
  };

  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const statusTone = (statusType) =>
    statusType === "approved" ? "success" : "warning";

  return (
    <PageShell className="documents">
      <PageHeader
        title="Документы"
        subtitle="Чеки, накладные и инвентаризация"
        actions={
          activeTab === "inventory" ? (
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => navigate("/crm/sklad")}
              title="Создать инвентаризацию"
              aria-label="Создать инвентаризацию"
            >
              <ClipboardList size={18} />
              <span className="nur-btn__label">Создать инвентаризацию</span>
            </button>
          ) : (
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => setShowReconciliationModal(true)}
            >
              Создать акт сверки
            </button>
          )
        }
      />

      <div className="nur-tabs documents__tabs" role="tablist" aria-label="Тип документов">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "receipts"}
          className={`nur-tabs__tab${activeTab === "receipts" ? " is-active" : ""}`}
          onClick={() => setActiveTab("receipts")}
        >
          Чеки
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "invoices"}
          className={`nur-tabs__tab${activeTab === "invoices" ? " is-active" : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          Накладные
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "inventory"}
          className={`nur-tabs__tab${activeTab === "inventory" ? " is-active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          Инвентаризация
        </button>
      </div>

      {activeTab !== "inventory" && (
        <FilterBar className="documents__search-bar">
          <div className="documents__search">
            <Search size={18} className="documents__search-icon" />
            <input
              type="text"
              className="nur-input documents__search-input"
              placeholder="Поиск по номеру или контрагенту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </FilterBar>
      )}

      <DataContainer className="documents__data">
        {activeTab === "inventory" ? (
          <InventorySessionsTab />
        ) : (
          <PagePanel flush className="documents__panel">
            <div className="nur-table-wrap">
              <table className="nur-table nur-table--dense">
                <thead>
                  <tr>
                    {activeTab === "receipts" && (
                      <>
                        <th>Номер</th>
                        <th>Дата и время</th>
                        <th>Клиент</th>
                        <th>Товаров</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </>
                    )}
                    {activeTab === "invoices" && (
                      <>
                        <th>Номер</th>
                        <th>Дата</th>
                        <th>Контрагент</th>
                        <th>Позиций</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {documentsLoading ? (
                    <tr>
                      <td colSpan={7}>
                        <LoadingState rows={4} />
                      </td>
                    </tr>
                  ) : getCurrentData().length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          title="Документы не найдены"
                          text="Измените поиск или создайте новый документ."
                        />
                      </td>
                    </tr>
                  ) : (
                    getCurrentData().map((item) => (
                      <tr key={item.id}>
                        {activeTab === "receipts" && (
                          <>
                            <td>{item.number}</td>
                            <td>{item.date}</td>
                            <td>{item.client}</td>
                            <td>{item.products}</td>
                            <td>{formatAmount(item.amount)} сом</td>
                            <td>
                              <StatusChip tone={statusTone(item.statusType)}>
                                {item.status}
                              </StatusChip>
                            </td>
                            <td>
                              <div className="documents__actions">
                                <button
                                  type="button"
                                  className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
                                  onClick={() => handleView(item)}
                                  title="Просмотр"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  type="button"
                                  className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
                                  onClick={() => handlePrint(item)}
                                  title="Печать"
                                >
                                  <Printer size={18} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                        {activeTab === "invoices" && (
                          <>
                            <td>{item.number}</td>
                            <td>{item.date}</td>
                            <td>{item.counterparty}</td>
                            <td>{item.positions}</td>
                            <td>{formatAmount(item.amount)} сом</td>
                            <td>
                              <StatusChip tone={statusTone(item.statusType)}>
                                {item.status}
                              </StatusChip>
                            </td>
                            <td>
                              <div className="documents__actions">
                                <button
                                  type="button"
                                  className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
                                  onClick={() => handleView(item)}
                                  title="Просмотр"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  type="button"
                                  className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
                                  onClick={() => handlePrint(item)}
                                  title="Печать"
                                >
                                  <Printer size={18} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PagePanel>
        )}
      </DataContainer>

      {activeTab !== "inventory" && totalPages > 1 && (
        <div className="documents__pagination">
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={
              currentPage === 1 || documentsLoading || !documentsPrevious
            }
          >
            Назад
          </button>
          <span className="documents__pagination-info">
            Страница {currentPage} из {totalPages || 1}
            {documentsCount && ` (${documentsCount} документов)`}
          </span>
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={
              documentsLoading ||
              !documentsNext ||
              (totalPages && currentPage >= totalPages)
            }
          >
            Вперед
          </button>
        </div>
      )}

      <ReconciliationModal
        open={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
      />

      {previewReceiptId && (
        <ReceiptPreviewModal
          receiptId={previewReceiptId}
          receiptData={null as any}
          onClose={() => setPreviewReceiptId(null)}
          onEdit={handleEditFromPreview}
        />
      )}

      {previewInvoiceId && (
        <InvoicePreviewModal
          invoiceId={previewInvoiceId}
          invoiceData={null as any}
          onClose={() => setPreviewInvoiceId(null)}
          onEdit={handleEditFromPreview}
        />
      )}

      {editReceiptId && (
        <ReceiptEditModal
          receiptId={editReceiptId}
          receiptData={editReceiptData}
          documentType={activeTab === "invoices" ? "invoice" : "receipt"}
          onClose={() => {
            setEditReceiptId(null);
            setEditReceiptData(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </PageShell>
  );
};

export default Documents;
