import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const getDocumentNumber = useCallback((index, prefix = t("crm.documents.receiptPrefix")) => {
    const sequentialNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
    return `${prefix}-${String(sequentialNumber).padStart(5, "0")}`;
  }, [currentPage, t]);

  // Маппинг данных из Redux в формат для отображения
  const receiptsData = useMemo(() => {
    if (activeTab !== "receipts") return [];
    return (documents || []).map((sale, index) => ({
      id: sale.id,
      number: getDocumentNumber(index, t("crm.documents.receiptPrefix")),
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
        t("crm.documents.noClient"),
      products: sale.items?.length || 0,
      amount: sale.total || "0.00",
      status: sale.status === "paid" ? t("crm.documents.statusPosted") : t("crm.documents.statusDraft"),
      statusType: sale.status === "paid" ? "approved" : "draft",
    }));
  }, [documents, activeTab, getDocumentNumber, t]);

  const invoicesData = useMemo(() => {
    if (activeTab !== "invoices") return [];
    return (documents || []).map((sale, index) => ({
      id: sale.id,
      number: getDocumentNumber(index, t("crm.documents.invoicePrefix")),
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
        t("crm.documents.noCounterparty"),
      positions: sale.items?.length || 0,
      amount: sale.total || "0.00",
      status: sale.status === "paid" ? t("crm.documents.statusPosted") : t("crm.documents.statusDraft"),
      statusType: sale.status === "paid" ? "approved" : "draft",
    }));
  }, [documents, activeTab, getDocumentNumber, t]);

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
          t("crm.documents.saveError"),
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
            throw new Error(t("crm.documents.noPdfData"));
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
          throw new Error(t("crm.documents.noInvoiceData"));
        }
      } else {
        // Для чека печатаем через USB принтер
        const isPrinterConnected = await checkPrinterConnection();

        if (!isPrinterConnected) {
          alert(
            t("crm.documents.printerDisconnected"),
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
            throw new Error(t("crm.documents.noPrintData"));
          }
        } else {
          throw new Error(t("crm.documents.noReceiptData"));
        }
      }
    } catch (printError) {
      const errorMessage = validateResErrors(printError, t("crm.documents.printError"));
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

  const renderDocumentActions = (item) => (
    <div className="documents__actions">
      <button
        type="button"
        className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
        onClick={() => handleView(item)}
        title={t("common.view")}
      >
        <Eye size={18} />
      </button>
      <button
        type="button"
        className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
        onClick={() => handlePrint(item)}
        title={t("common.print")}
      >
        <Printer size={18} />
      </button>
    </div>
  );

  const renderDocumentCard = (item) => {
    const isReceipt = activeTab === "receipts";

    return (
      <article key={item.id} className="nur-card-list__item documents__card">
        <div className="documents__card-head">
          <strong className="documents__card-title">{item.number}</strong>
          <StatusChip tone={statusTone(item.statusType)}>{item.status}</StatusChip>
        </div>
        <div className="nur-card-list__row">
          <span className="nur-card-list__label">
            {isReceipt ? t("crm.documents.dateTime") : t("crm.documents.date")}
          </span>
          <span className="nur-card-list__value">{item.date}</span>
        </div>
        <div className="nur-card-list__row">
          <span className="nur-card-list__label">
            {isReceipt ? t("crm.documents.client") : t("crm.documents.counterparty")}
          </span>
          <span className="nur-card-list__value">
            {isReceipt ? item.client : item.counterparty}
          </span>
        </div>
        <div className="nur-card-list__row">
          <span className="nur-card-list__label">
            {isReceipt ? t("crm.documents.products") : t("crm.documents.positions")}
          </span>
          <span className="nur-card-list__value">
            {isReceipt ? item.products : item.positions}
          </span>
        </div>
        <div className="nur-card-list__row">
          <span className="nur-card-list__label">{t("crm.documents.amount")}</span>
          <span className="nur-card-list__value">
            {formatAmount(item.amount)} {t("common.currencySom")}
          </span>
        </div>
        <div className="documents__card-actions">{renderDocumentActions(item)}</div>
      </article>
    );
  };

  const renderDocumentsBody = () => {
    if (documentsLoading) {
      return <LoadingState rows={4} />;
    }

    if (getCurrentData().length === 0) {
      return (
        <EmptyState
          title={t("crm.documents.notFound")}
          text={t("crm.documents.notFoundHint")}
        />
      );
    }

    return getCurrentData().map((item) => renderDocumentCard(item));
  };

  return (
    <PageShell className="documents">
      <PageHeader
        title={t("crm.documents.pageTitle")}
        subtitle={t("crm.documents.subtitle")}
        actions={
          activeTab === "inventory" ? (
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => navigate("/crm/sklad")}
              title={t("crm.documents.createInventory")}
              aria-label={t("crm.documents.createInventory")}
            >
              <ClipboardList size={18} />
              <span className="nur-btn__label">{t("crm.documents.createInventory")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => setShowReconciliationModal(true)}
            >
              {t("crm.documents.createReconciliation")}
            </button>
          )
        }
      />

      <div className="nur-tabs documents__tabs" role="tablist" aria-label={t("crm.documents.tabsAriaLabel")}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "receipts"}
          className={`nur-tabs__tab${activeTab === "receipts" ? " is-active" : ""}`}
          onClick={() => setActiveTab("receipts")}
        >
          {t("crm.documents.receipts")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "invoices"}
          className={`nur-tabs__tab${activeTab === "invoices" ? " is-active" : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          {t("crm.documents.invoices")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "inventory"}
          className={`nur-tabs__tab${activeTab === "inventory" ? " is-active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          {t("crm.documents.inventory")}
        </button>
      </div>

      {activeTab !== "inventory" && (
        <FilterBar className="documents__search-bar">
          <div className="documents__search">
            <Search size={18} className="documents__search-icon" />
            <input
              type="text"
              className="nur-input documents__search-input"
              placeholder={t("crm.documents.searchPlaceholder")}
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
            <div className="nur-table-wrap nur-table-wrap--responsive documents__table-wrap">
              <table className="nur-table nur-table--dense">
                <thead>
                  <tr>
                    {activeTab === "receipts" && (
                      <>
                        <th>{t("crm.documents.number")}</th>
                        <th>{t("crm.documents.dateTime")}</th>
                        <th>{t("crm.documents.client")}</th>
                        <th>{t("crm.documents.products")}</th>
                        <th>{t("crm.documents.amount")}</th>
                        <th>{t("crm.documents.status")}</th>
                        <th>{t("crm.documents.actions")}</th>
                      </>
                    )}
                    {activeTab === "invoices" && (
                      <>
                        <th>{t("crm.documents.number")}</th>
                        <th>{t("crm.documents.date")}</th>
                        <th>{t("crm.documents.counterparty")}</th>
                        <th>{t("crm.documents.positions")}</th>
                        <th>{t("crm.documents.amount")}</th>
                        <th>{t("crm.documents.status")}</th>
                        <th>{t("crm.documents.actions")}</th>
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
                          title={t("crm.documents.notFound")}
                          text={t("crm.documents.notFoundHint")}
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
                            <td>{formatAmount(item.amount)} {t("common.currencySom")}</td>
                            <td>
                              <StatusChip tone={statusTone(item.statusType)}>
                                {item.status}
                              </StatusChip>
                            </td>
                            <td>{renderDocumentActions(item)}</td>
                          </>
                        )}
                        {activeTab === "invoices" && (
                          <>
                            <td>{item.number}</td>
                            <td>{item.date}</td>
                            <td>{item.counterparty}</td>
                            <td>{item.positions}</td>
                            <td>{formatAmount(item.amount)} {t("common.currencySom")}</td>
                            <td>
                              <StatusChip tone={statusTone(item.statusType)}>
                                {item.status}
                              </StatusChip>
                            </td>
                            <td>{renderDocumentActions(item)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="nur-card-list nur-card-list--responsive documents__card-list">
              {renderDocumentsBody()}
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
            {t("common.back")}
          </button>
          <span className="documents__pagination-info">
            {t("common.paginationPage", { current: currentPage, total: totalPages || 1 })}
            {documentsCount &&
              ` ${t("common.paginationCount", {
                count: documentsCount,
                label: t("crm.documents.documentsCount"),
              })}`}
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
            {t("common.forward")}
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
