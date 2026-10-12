import { useTranslation } from "react-i18next";
import BarberMastersPortal from "./BarberMastersPortal";
import { fullName, getMembershipCommonWarehouseIds } from "../masters.utils";

const WarehouseAgentModal = ({
  open,
  employee,
  existingMembership,
  assignedWarehouse,
  setAssignedWarehouse,
  commonEnabled,
  setCommonEnabled,
  commonWarehouses,
  canSellWholesale,
  setCanSellWholesale,
  warehouses,
  warehousesLoading,
  membershipLoading,
  saving,
  error,
  getWarehouseAgentLabel,
  toggleCommonWarehouse,
  onSubmit,
  onClose,
}) => {
  const { t } = useTranslation();
  const tw = (k: string): string =>
    t(`crm.employees.warehouseAgentModal.${k}`) as string;
  if (!open || !employee) return null;

  return (
    <BarberMastersPortal wrapperId="barbermasters-warehouse-agent">
      <div
        className="barbermasters__overlay"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="barbermasters__modal"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="barbermasters__modalHeader">
            <h3 className="barbermasters__modalTitle">{tw("title")}</h3>
            <button
              type="button"
              className="barbermasters__iconBtn"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </header>
          <form className="barbermasters__form" onSubmit={onSubmit}>
            <div className="barbermasters__content">
              <div className="barbermasters__field barbermasters__field--full">
                <div className="barbermasters__employeeCard">
                  <div className="barbermasters__employeeAvatar">
                    {(fullName(employee) || employee.email || "•")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="barbermasters__employeeInfo">
                    <div className="barbermasters__employeeName">
                      {fullName(employee) || tw("noName")}
                    </div>
                    <div className="barbermasters__employeeMeta">
                      {employee.email || employee.id}
                    </div>
                  </div>
                </div>
              </div>

              {existingMembership && (
                <div className="barbermasters__field barbermasters__field--full">
                  <div className="barbermasters__help">
                    {tw("currentAssignment")}{" "}
                    <strong>
                      {getWarehouseAgentLabel(
                        existingMembership.assigned_warehouse,
                      )}
                    </strong>
                    {existingMembership.common_access_enabled && (
                      <>
                        {" "}
                        · {tw("commonAccessInline")}{" "}
                        <strong>
                          {getMembershipCommonWarehouseIds(existingMembership)
                            .map((id) => getWarehouseAgentLabel(id))
                            .join(", ") || "—"}
                        </strong>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">
                  {tw("limitToOneWarehouse")}
                </label>
                <select
                  className="barbermasters__input"
                  value={assignedWarehouse}
                  onChange={(e) => setAssignedWarehouse(e.target.value)}
                  disabled={saving || warehousesLoading || membershipLoading}
                >
                  <option value="">
                    {warehousesLoading || membershipLoading
                      ? t("common.loading")
                      : tw("allCompanyWarehouses")}
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name || w.title || w.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">
                  {tw("warehouseAccess")}
                </label>
                <div className="barbermasters__seg">
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      !commonEnabled ? "is-active" : ""
                    }`}
                    onClick={() => setCommonEnabled(false)}
                    disabled={saving}
                  >
                    {tw("ownStockOnly")}
                  </button>
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      commonEnabled ? "is-active" : ""
                    }`}
                    onClick={() => setCommonEnabled(true)}
                    disabled={saving}
                  >
                    {tw("commonWarehousePrice")}
                  </button>
                </div>
              </div>

              {commonEnabled && (
                <div className="barbermasters__field barbermasters__field--full">
                  <label className="barbermasters__label">
                    {tw("commonAccessWarehouses")}{" "}
                    <span className="barbermasters__req">*</span>
                  </label>
                  {warehousesLoading || membershipLoading ? (
                    <div className="barbermasters__help">
                      {t("common.loading")}
                    </div>
                  ) : warehouses.length === 0 ? (
                    <div className="barbermasters__help">
                      {tw("noWarehouses")}
                    </div>
                  ) : (
                    <div
                      className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3"
                      role="group"
                      aria-label={tw("commonAccessWarehouses")}
                    >
                      {warehouses.map((w) => {
                        const id = String(w.id);
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={commonWarehouses.includes(id)}
                              onChange={() => toggleCommonWarehouse(id)}
                              disabled={saving}
                            />
                            {w.name || w.title || id}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="barbermasters__help">
                    {tw("commonAccessHint")}
                  </div>
                </div>
              )}

              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">
                  {t("crm.employees.accessModal.wholesaleSales")}
                </label>
                <div className="barbermasters__seg">
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      !canSellWholesale ? "is-active" : ""
                    }`}
                    onClick={() => setCanSellWholesale(false)}
                    disabled={saving}
                  >
                    {t("crm.employees.accessModal.wholesalePrice")}
                  </button>
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      canSellWholesale ? "is-active" : ""
                    }`}
                    onClick={() => setCanSellWholesale(true)}
                    disabled={saving}
                  >
                    {t("crm.employees.accessModal.agentPrice")}
                  </button>
                </div>
                <div className="barbermasters__help">{tw("wholesaleHint")}</div>
              </div>

              {error && (
                <div className="barbermasters__alert barbermasters__alert--inModal">
                  {error}
                </div>
              )}
            </div>

            <div className="barbermasters__modalFooter pl-5 pb-5 flex gap-3">
              <button
                type="submit"
                className="nur-btn nur-btn--primary"
                disabled={saving}
              >
                {saving
                  ? t("common.saving")
                  : existingMembership
                    ? t("crm.employees.editModal.saveChanges")
                    : tw("assignAsAgent")}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={onClose}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default WarehouseAgentModal;
