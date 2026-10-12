import { useTranslation } from "react-i18next";
import { ArrowLeft, Package, Scan } from "lucide-react";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import { PageShell, PageHeader, PagePanel } from "@shared/ui/page-shell";
import { sphereHiddenProductBlocks, useMarketSphere, useUser } from "@entities/user";
import AddProductBarcode from "./AddProductBarcode";
import { useAddProductPage } from "./AddProductPage/hooks/useAddProductPage";
import MarketProductForm from "./AddProductPage/components/MarketProductForm";
import ManualEntryForm from "./AddProductPage/components/ManualEntryForm";
import {
  LayoutHeaderActions,
  ProductFormLayoutProvider,
} from "./AddProductPage/formLayout";
import "./AddProductPage.scss";
import "./AddProductPage/formLayout/ProductFormLayout.scss";

const AddProductPage = ({
  embedded = false,
  embeddedPrefillSupplierId = "",
  embeddedReturnTo = "",
  onEmbeddedClose = null,
  onEmbeddedSaved = null,
  forceProductOnly = false,
}: any) => {
  const p = useAddProductPage({
    embedded,
    embeddedPrefillSupplierId,
    embeddedReturnTo,
    onEmbeddedClose,
    onEmbeddedSaved,
    forceProductOnly,
  });
  const { profile } = useUser();
  const { sphere } = useMarketSphere();
  const { t } = useTranslation();
  const role = String(profile?.role || "").toLowerCase();
  const canCustomizeForm = role === "owner" || role === "admin";
  const tp = (k: string, o?: any): string =>
    t(`crm.warehouse.addProduct.${k}`, o) as string;

  return (
    <ProductFormLayoutProvider
      companyId={p.company?.id}
      canCustomize={canCustomizeForm}
      values={{
        itemType: p.itemType,
        newItemData: p.newItemData,
        marketData: p.marketData,
        images: p.images,
        showDebtForm: p.showDebtForm,
      }}
      onSaveError={(message) => p.showAlert(message, "error", tp("errorTitle"))}
      sphereHidden={sphereHiddenProductBlocks(sphere)}
    >
      <>
        <AlertModal
          open={p.alertModal.open}
          type={p.alertModal.type}
          title={p.alertModal.title}
          message={p.alertModal.message}
          onClose={() => p.setAlertModal({ ...p.alertModal, open: false })}
          onConfirm={() => p.setAlertModal({ ...p.alertModal, open: false })}
        />
        <PageShell className="add-product-page">
          <PageHeader
            title={p.isEditMode ? tp("editTitle") : tp("createTitle")}
            subtitle={p.isEditMode ? tp("editSubtitle") : tp("createSubtitle")}
            actions={
              <div className="add-product-page__layout-actions">
                <LayoutHeaderActions />
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary add-product-page__back"
                  onClick={p.handleReturn}
                >
                  <ArrowLeft size={20} />
                  {tp("backToWarehouse")}
                </button>
              </div>
            }
          />

          <PagePanel className="add-product-page__content">
            {p.isEditMode && p.loadingProduct && (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p>{tp("loadingProduct")}</p>
              </div>
            )}

            {!p.isEditMode && !p.loadingProduct && (
              <div className="add-product-page__tabs">
                <button
                  className={`add-product-page__tab  text-[12px] md:text-[14px] ${
                    p.activeTab === 0 ? "add-product-page__tab--active" : ""
                  }`}
                  onClick={() => p.setActiveTab(0)}
                >
                  <Package size={18} />
                  {tp("tabManual")}
                </button>
                <button
                  className={`add-product-page__tab  text-[12px] md:text-[14px] py-2.5 px-3 md:py-3 md:px-6 ${
                    p.activeTab === 1 ? "add-product-page__tab--active" : ""
                  }`}
                  onClick={() => p.setActiveTab(1)}
                >
                  <Scan size={18} />
                  {tp("tabScan")}
                </button>
              </div>
            )}

            {!p.isEditMode && !p.loadingProduct && p.activeTab === 1 ? (
              <div className="add-product-page__scan-section">
                {!p.scannedProduct && (
                  <div className="add-product-page__scan-box">
                    <Scan size={48} />
                    <h3>{tp("scanTitle")}</h3>
                    <p>{tp("scanHint")}</p>
                  </div>
                )}
                <AddProductBarcode
                  onClose={p.handleReturn}
                  onShowSuccessAlert={(productName) => {
                    p.showAlert(
                      tp("productAddedSuccess", { name: productName }),
                      "success",
                      tp("successTitle"),
                    );
                    setTimeout(() => {
                      p.handleReturn();
                    }, 1500);
                  }}
                  onShowErrorAlert={(errorMsg) => {
                    p.showAlert(errorMsg, "error", tp("errorTitle"));
                  }}
                  onShowSupplierCreated={(message) => {
                    p.showAlert(message, "success", tp("successTitle"));
                  }}
                />
              </div>
            ) : p.isEditMode && p.productLoadError ? (
              // Товар не загрузился — без формы: пустую форму можно было «сохранить»
              // поверх настоящего товара
              <div className="add-product-page__load-error" role="alert">
                <p>{p.productLoadError}</p>
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary"
                  onClick={p.handleReturn}
                >
                  {tp("backToWarehouse")}
                </button>
              </div>
            ) : !p.loadingProduct ? (
              <MarketProductForm
                editingProductId={p.productId}
                itemType={p.itemType}
                setItemType={p.setItemType}
                forceProductOnly={forceProductOnly}
                newItemData={p.newItemData}
                setNewItemData={p.setNewItemData}
                marketData={p.marketData}
                handleMarketDataChange={p.handleMarketDataChange}
                onAdultEnabled={() =>
                  p.showAlert(
                    tp("adultAlertText"),
                    "info",
                    tp("adultAlertTitle"),
                  )
                }
                handlePromotionStockChange={p.handlePromotionStockChange}
                handleChange={p.handleChange}
                brands={p.brands || []}
                categories={p.categories || []}
                products={p.products || []}
                filterClient={p.filterClient}
                handleSubmit={p.handleSubmit}
                creating={p.creating || p.updating}
                _navigate={p.navigate}
                handleReturn={p.handleReturn}
                generateBarcode={p.generateBarcode}
                addProductToKit={p.addProductToKit}
                removeProductFromKit={p.removeProductFromKit}
                recalculateKitPrice={p.recalculateKitPrice}
                handleUpdateKitProductQuantity={
                  p.handleUpdateKitProductQuantity
                }
                showKitRecalculateTooltip={p.showKitRecalculateTooltip}
                setShowKitRecalculateTooltip={p.setShowKitRecalculateTooltip}
                images={p.images}
                _setImages={p.setImages}
                fileInputRef={p.fileInputRef}
                addImages={p.addImages}
                imageCropper={p.imageCropper}
                removeImage={p.removeImage}
                setPrimaryImage={p.setPrimaryImage}
                isEditMode={p.isEditMode}
                fieldErrors={p.fieldErrors}
                showBrandInputs={p.showBrandInputs}
                setShowBrandInputs={p.setShowBrandInputs}
                newBrand={p.newBrand}
                setNewBrand={p.setNewBrand}
                onSubmitBrand={p.onSubmitBrand}
                isBrandNameTaken={p.isBrandNameTaken}
                isCategoryNameTaken={p.isCategoryNameTaken}
                showCategoryInputs={p.showCategoryInputs}
                setShowCategoryInputs={p.setShowCategoryInputs}
                newCategory={p.newCategory}
                setNewCategory={p.setNewCategory}
                onSubmitCategory={p.onSubmitCategory}
                showInputs={p.showInputs}
                setShowInputs={p.setShowInputs}
                state={p.state}
                setState={p.setState}
                onSubmit={p.onSubmit}
                debt={p.debt}
                setDebt={p.setDebt}
                amount={p.amount}
                setAmount={p.setAmount}
                debtMonths={p.debtMonths}
                setDebtMonths={p.setDebtMonths}
                showDebtForm={p.showDebtForm}
                setShowDebtForm={p.setShowDebtForm}
                debtState={p.debtState}
                _setDebtState={p.setDebtState}
                onChangeDebt={p.onChangeDebt}
                _pickSupplier={p.pickSupplier}
                company={p.company}
              />
            ) : (
              <ManualEntryForm
                productType={p.productType}
                setProductType={p.setProductType}
                newItemData={p.newItemData}
                setNewItemData={p.setNewItemData}
                handleChange={p.handleChange}
                fieldErrors={p.fieldErrors}
                company={p.company}
                brandOptions={p.brandOptions}
                categoryOptions={p.categoryOptions}
                brandsLoading={p.brandsLoading}
                categoriesLoading={p.categoriesLoading}
                hasMoreBrands={p.hasMoreBrands}
                hasMoreCategories={p.hasMoreCategories}
                setBrandQuery={p.setBrandQuery}
                setCategoryQuery={p.setCategoryQuery}
                handleLoadMoreBrands={p.handleLoadMoreBrands}
                handleLoadMoreCategories={p.handleLoadMoreCategories}
                showBrandInputs={p.showBrandInputs}
                setShowBrandInputs={p.setShowBrandInputs}
                newBrand={p.newBrand}
                setNewBrand={p.setNewBrand}
                onSubmitBrand={p.onSubmitBrand}
                isBrandNameTaken={p.isBrandNameTaken}
                showCategoryInputs={p.showCategoryInputs}
                setShowCategoryInputs={p.setShowCategoryInputs}
                newCategory={p.newCategory}
                setNewCategory={p.setNewCategory}
                onSubmitCategory={p.onSubmitCategory}
                isCategoryNameTaken={p.isCategoryNameTaken}
                marketData={p.marketData}
                filterClient={p.filterClient}
                showInputs={p.showInputs}
                setShowInputs={p.setShowInputs}
                onSubmit={p.onSubmit}
                onChange={p.onChange}
                showDebtForm={p.showDebtForm}
                setShowDebtForm={p.setShowDebtForm}
                debt={p.debt}
                setDebt={p.setDebt}
                amount={p.amount}
                setAmount={p.setAmount}
                debtMonths={p.debtMonths}
                setDebtMonths={p.setDebtMonths}
                debtState={p.debtState}
                onChangeDebt={p.onChangeDebt}
                handleReturn={p.handleReturn}
                handleSubmit={p.handleSubmit}
                creating={p.creating}
                paidFromShiftDrawer={p.paidFromShiftDrawer}
                setPaidFromShiftDrawer={p.setPaidFromShiftDrawer}
                shiftDrawerFundingTarget={p.shiftDrawerFundingTarget}
              />
            )}
          </PagePanel>
        </PageShell>
      </>
    </ProductFormLayoutProvider>
  );
};

export default AddProductPage;
