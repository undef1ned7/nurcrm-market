import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  X,
  Edit,
  Copy,
  Trash2,
  Calendar,
  Tag,
  Globe,
  Box,
  FileText,
  Plus,
  AlertTriangle,
} from "lucide-react";
import "../Warehouse.scss";
import PurchaseBatchHistory from "./PurchaseBatchHistory";
import api from "@shared/api";
import noImage from "./placeholder.png";
import AddProductModal from "@features/warehouse-ops/ui/AddProduct/AddProductModal";
import MarriageModal from "@features/warehouse-ops/ui/MarriageModal";
import { deleteProductAsync } from "@entities/product";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import {
  PageShell,
  PageHeader,
  PagePanel,
  StatusChip,
} from "@shared/ui/page-shell";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAlert } from "@shared/hooks/useDialog";

const ProductDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const alert = useAlert();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<any>(true);
  const [currentImageIndex, setCurrentImageIndex] = useState<any>(0);
  const [showAddProductModal, setShowAddProductModal] = useState<any>(false);
  const [showMarriageModal, setShowMarriageModal] = useState<any>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(false);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/main/products/${id}/`);
      setProduct(response.data);
    } catch (error: any) {
      console.error("Ошибка при загрузке товара:", error);
      const errorMessage = validateResErrors(
        error,
        t("crm.warehouse.detail.loadError"),
      );
      alert(errorMessage, true);
    } finally {
      setLoading(false);
    }
  }, [alert, id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleEdit = () => {
    navigate(`/crm/sklad/add-product/${id}`);
  };

  const handleDuplicate = () => {
    // Переходим на страницу создания товара с данными для дублирования
    navigate("/crm/sklad/add-product", {
      state: {
        duplicate: true,
        productData: product,
      },
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteProductAsync(product.id) as any).unwrap();
      setShowDeleteConfirm(false);
      navigate(-1); // Возвращаемся назад после удаления
    } catch (error: any) {
      console.error("Ошибка при удалении товара:", error);
      setShowDeleteConfirm(false);
      const errorMessage = validateResErrors(
        error,
        t("crm.warehouse.detail.deleteError"),
      );
      alert(errorMessage, true);
    }
  };

  const formatPrice = (price: any) => {
    return parseFloat(price || 0).toFixed(2);
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const months = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Получаем список изображений
  const imagesList = Array.isArray(product?.images) ? product.images : [];
  const hasImages = imagesList.length > 0;

  // Находим индекс основного изображения или используем первое
  useEffect(() => {
    const images = Array.isArray(product?.images) ? product.images : [];
    if (images.length > 0) {
      const primaryIndex = images.findIndex((img: any) => img.is_primary);
      setCurrentImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
    }
  }, [product?.images]);

  const nextImage = () => {
    setCurrentImageIndex((prev: any) => (prev + 1) % imagesList.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev: any) => (prev - 1 + imagesList.length) % imagesList.length,
    );
  };

  if (loading) {
    return (
      <PageShell className="product-detail">
        <div className="product-detail-loading">{t("common.loading")}</div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell className="product-detail">
        <div className="product-detail-error">
          {t("crm.warehouse.detail.notFound")}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="product-detail">
      <PageHeader
        title={product.name || t("crm.warehouse.productAlt")}
        subtitle={t("crm.warehouse.detail.subtitle")}
        actions={
          <div className="product-detail__header">
            <button
              type="button"
              className="nur-btn nur-btn--ghost nur-btn--sm product-detail__close-btn"
              onClick={() => navigate(-1)}
              aria-label={t("common.back")}
              title={t("common.back")}
            >
              <X size={20} />
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              onClick={handleEdit}
              title={t("common.edit")}
              aria-label={t("common.edit")}
            >
              <Edit size={16} />
              <span className="nur-btn__label">{t("common.edit")}</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              onClick={handleDuplicate}
              title={t("crm.warehouse.detail.duplicate")}
              aria-label={t("crm.warehouse.detail.duplicate")}
            >
              <Copy size={16} />
              <span className="nur-btn__label">
                {t("crm.warehouse.detail.duplicate")}
              </span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--danger nur-btn--sm"
              onClick={handleDelete}
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 size={16} />
              <span className="nur-btn__label">{t("common.delete")}</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary nur-btn--sm"
              onClick={() => setShowAddProductModal(true)}
              title={t("crm.clients.details.addBtn")}
              aria-label={t("crm.clients.details.addBtn")}
            >
              <Plus size={16} />
              <span className="nur-btn__label">
                {t("crm.clients.details.addBtn")}
              </span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              onClick={() => setShowMarriageModal(true)}
              title={t("crm.warehouse.detail.marriage")}
              aria-label={t("crm.warehouse.detail.marriage")}
            >
              <AlertTriangle size={16} />
              <span className="nur-btn__label">
                {t("crm.warehouse.detail.marriage")}
              </span>
            </button>
          </div>
        }
      />

      <PagePanel className="product-detail__content">
        {/* Image Section */}
        <div className="product-detail__hero">
          <div className="product-detail__image-section">
            {hasImages ? (
              <>
                <div className="product-detail__main-image ">
                  <img
                    src={imagesList[currentImageIndex]?.image_url}
                    alt={product.name || t("crm.warehouse.productAlt")}
                    className="product-detail__image"
                  />
                  {imagesList.length > 1 && (
                    <>
                      <button
                        className="product-detail__image-nav product-detail__image-nav--prev"
                        onClick={prevImage}
                      >
                        ‹
                      </button>
                      <button
                        className="product-detail__image-nav product-detail__image-nav--next"
                        onClick={nextImage}
                      >
                        ›
                      </button>
                    </>
                  )}
                  {imagesList[currentImageIndex]?.is_primary && (
                    <div className="product-detail__image-primary-badge">
                      {t("crm.warehouse.detail.primaryImage")}
                    </div>
                  )}
                </div>
                {imagesList.length > 1 && (
                  <div className="product-detail__image-thumbnails">
                    {imagesList.map((image: any, index: any) => (
                      <div
                        key={image.id || index}
                        className={`product-detail__thumbnail ${
                          index === currentImageIndex
                            ? "product-detail__thumbnail--active"
                            : ""
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img
                          src={image.image_url}
                          alt={`${product.name} ${index + 1}`}
                        />
                        {image.is_primary && (
                          <div className="product-detail__thumbnail-badge">
                            ★
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="product-detail__image-placeholder">
                <img
                  src={noImage}
                  alt={t("crm.warehouse.detail.noImage")}
                  className="product-detail__placeholder-image"
                />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-detail__info-section">
            <StatusChip tone="primary">
              {t("crm.warehouse.detail.productChip")}
            </StatusChip>
            <h2 className="product-detail__name">{product.name || "—"}</h2>
            <div className="product-detail__details">
              <div className="product-detail__detail-item">
                <span className="product-detail__detail-label">
                  {t("crm.warehouse.detail.barcodeLabel")}
                </span>
                <span className="product-detail__detail-value">
                  {product.barcode || "—"}
                </span>
              </div>
              {Array.isArray(product.alternate_barcodes) &&
              product.alternate_barcodes.length > 0 ? (
                <div className="product-detail__detail-item">
                  <span className="product-detail__detail-label">
                    {t("crm.warehouse.detail.extraBarcodes")}
                  </span>
                  <span className="product-detail__detail-value">
                    {product.alternate_barcodes.filter(Boolean).join(", ")}
                  </span>
                </div>
              ) : null}
              <div className="product-detail__detail-item">
                <span className="product-detail__detail-label">
                  {t("crm.warehouse.detail.articleLabel")}
                </span>
                <span className="product-detail__detail-value">
                  {product.article || "—"}
                </span>
              </div>
              <div className="product-detail__detail-item">
                <span className="product-detail__detail-label">
                  {t("crm.warehouse.detail.codeLabel")}
                </span>
                <span className="product-detail__detail-value">
                  {product.code || "—"}
                </span>
              </div>
              <div className="product-detail__detail-item">
                <span className="product-detail__detail-label">
                  {t("crm.warehouse.detail.pluLabel")}
                </span>
                <span className="product-detail__detail-value">
                  {product.plu !== null &&
                  product.plu !== undefined &&
                  String(product.plu).trim() !== ""
                    ? product.plu
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {/* <div className="product-detail__tabs">
          <button
            className={`product-detail__tab ${
              activeTab === "info" ? "product-detail__tab--active" : ""
            }`}
            onClick={() => setActiveTab("info")}
          >
            Информация
          </button>
          <button
            className={`product-detail__tab ${
              activeTab === "history" ? "product-detail__tab--active" : ""
            }`}
            onClick={() => setActiveTab("history")}
          >
            История движения
          </button>
        </div> */}

        {/* Tab Content */}
        {/* {activeTab === "info" ? ( */}
        <div className="product-detail__tab-content">
          {/* Information Section */}
          <div className="product-detail__section mt-5">
            <h3 className="product-detail__section-title">
              {t("crm.warehouse.detail.sectionInfo")}
            </h3>
            <div className="product-detail__info-list">
              <div className="product-detail__info-item">
                <Calendar className="product-detail__info-icon" size={18} />
                <span className="product-detail__info-label">
                  {t("crm.warehouse.detail.createdLabel")}
                </span>
                <span className="product-detail__info-value">
                  {formatDate(product.created_at)}
                </span>
              </div>
              <div className="product-detail__info-item">
                <Tag className="product-detail__info-icon" size={18} />
                <span className="product-detail__info-label">
                  {t("crm.warehouse.detail.categoryLabel")}
                </span>
                <span className="product-detail__info-value">
                  {product.category || "—"}
                </span>
              </div>
              <div className="product-detail__info-item">
                <Globe className="product-detail__info-icon" size={18} />
                <span className="product-detail__info-label">
                  {t("crm.warehouse.detail.countryLabel")}
                </span>
                <span className="product-detail__info-value">
                  {product.country || "—"}
                </span>
              </div>
              <div className="product-detail__info-item">
                <Calendar className="product-detail__info-icon" size={18} />
                <span className="product-detail__info-label">
                  {t("crm.warehouse.detail.shelfLifeLabel")}
                </span>
                <span className="product-detail__info-value">
                  {product.expiration_date
                    ? formatDate(product.expiration_date)
                    : "—"}
                </span>
              </div>
              <div className="product-detail__info-item">
                <Box className="product-detail__info-icon" size={18} />
                <span className="product-detail__info-label">
                  {t("crm.warehouse.detail.groupLabel")}
                </span>
                <span className="product-detail__info-value">
                  {product.group || t("crm.warehouse.detail.groupDefault")}
                </span>
              </div>
              <div className="product-detail__info-item">
                <FileText className="product-detail__info-icon" size={18} />
                <span className="product-detail__info-label">
                  {t("crm.warehouse.detail.descriptionLabel")}
                </span>
                <span className="product-detail__info-value">
                  {product.description || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Prices Section */}
          <div className="product-detail__section">
            <h3 className="product-detail__section-title">
              {t("crm.warehouse.detail.pricesTitle")}
            </h3>
            <table className="product-detail__prices-table overflow-auto">
              <thead>
                <tr>
                  <th>{t("crm.warehouse.detail.sellPrice")}</th>
                  <th>
                    {t("crm.warehouse.detail.purchasePrice")}
                    <span className="product-detail__price-hint">
                      {t("crm.warehouse.detail.lastBatch")}
                    </span>
                  </th>
                  {/* <th>Себестоимость</th> */}
                  <th>{t("crm.warehouse.detail.markup")}</th>
                  {/* <th>Маржинальность</th> */}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {formatPrice(product.price)} {t("common.currencySom")}
                  </td>
                  <td>
                    {formatPrice(product.purchase_price)}{" "}
                    {t("common.currencySom")}
                  </td>
                  {/* <td>
                      {formatPrice(product.purchase_price)} сом
                      <span className="product-detail__help-icon">?</span>
                    </td> */}
                  <td>{product.markup_percent}%</td>
                  {/* <td>
                      {product.price
                        ? `${Math.round(
                            ((product.price -
                              (product.cost_price ||
                                product.purchase_price ||
                                0)) /
                              product.price) *
                              100
                          )}%`
                        : "—"}
                    </td> */}
                </tr>
              </tbody>
            </table>
          </div>

          <PurchaseBatchHistory
            productId={product.id}
            productName={product.name}
            batches={product.purchase_batches}
          />

          {/* Warehouse Section */}
          {/* <div className="product-detail__section">
              <h3 className="product-detail__section-title">СКЛАД</h3>
              <table className="product-detail__warehouse-table">
                <thead>
                  <tr>
                    <th>Магазин</th>
                    <th>Цена продажи, сом</th>
                    <th>Остаток, шт</th>
                    <th>По себестоимости, сом</th>
                    <th>По цене продажи, сом</th>
                  </tr>
                </thead>
                <tbody>
                  {product.warehouses?.map((warehouse: any, index: any) => (
                    <tr key={index}>
                      <td>{warehouse.name || "—"}</td>
                      <td>{formatPrice(warehouse.price || product.price)}</td>
                      <td>
                        {warehouse.stock !== null &&
                        warehouse.stock !== undefined
                          ? warehouse.stock
                              .toString()
                              .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                          : "—"}
                      </td>
                      <td>
                        {formatPrice(
                          (warehouse.cost_price || product.cost_price || 0) *
                            (warehouse.stock || 0)
                        )}
                      </td>
                      <td>
                        {formatPrice(
                          (warehouse.price || product.price) *
                            (warehouse.stock || 0)
                        )}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5}>Нет данных о складах</td>
                    </tr>
                  )}
                  <tr className="product-detail__warehouse-total">
                    <td>Итог</td>
                    <td>—</td>
                    <td>
                      {product.total_stock !== null &&
                      product.total_stock !== undefined
                        ? product.total_stock
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                        : "—"}
                    </td>
                    <td>{formatPrice(product.total_cost || 0)}</td>
                    <td>{formatPrice(product.total_value || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div> */}
        </div>
        {/* ) : ( */}
        {/* <MovementHistory productId={id} productCode={product.code} /> */}
        {/* )} */}
      </PagePanel>

      {/* Модальные окна */}
      {showAddProductModal && (
        <AddProductModal
          onClose={() => setShowAddProductModal(false)}
          onChanged={() => {
            fetchProduct();
            setShowAddProductModal(false);
          }}
          item={product}
        />
      )}

      {showMarriageModal && (
        <MarriageModal
          onClose={() => setShowMarriageModal(false)}
          onChanged={() => {
            fetchProduct();
            setShowMarriageModal(false);
          }}
          item={product}
        />
      )}

      {/* Модалка подтверждения удаления */}
      <AlertModal
        open={showDeleteConfirm}
        type="warning"
        title={t("crm.warehouse.detail.deleteConfirmTitle")}
        message={t("crm.warehouse.detail.deleteConfirmMessage")}
        okText={t("common.delete")}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
};

export default ProductDetail;
