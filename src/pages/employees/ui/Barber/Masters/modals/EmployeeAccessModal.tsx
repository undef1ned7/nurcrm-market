import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import AccessList from "@widgets/department-details/ui/AccessList";
import BarberMastersPortal from "./BarberMastersPortal";

const EmployeeAccessModal = ({
  accessModalOpen,
  setAccessModalOpen,
  accessModalEmployee,
  accessModalAccesses,
  handleSaveEmployeeAccesses,
  profile,
  tariff,
  company,
  empSaving,
  isWarehouseSector = false,
  isOwnerOrAdmin = false,
  warehouseMembership = null,
  warehouseMembershipLoading = false,
  canSellWholesale = false,
  onCanSellWholesaleChange,
}) => {
  const { t } = useTranslation();
  const tm = (k: string, o?: any): string =>
    t(`crm.employees.accessModal.${k}`, o) as string;
  if (!accessModalOpen || !accessModalEmployee) return null;

  const showWarehouseWholesaleSection = isWarehouseSector && isOwnerOrAdmin;
  const employeeName =
    accessModalEmployee.first_name && accessModalEmployee.last_name
      ? `${accessModalEmployee.first_name} ${accessModalEmployee.last_name}`
      : accessModalEmployee.email || tm("employeeFallback");

  return (
    <BarberMastersPortal wrapperId="barbermasters-employeeaccessmodal">
      <div
        className="barbermasters__overlay"
        onClick={() => !empSaving && setAccessModalOpen(false)}
      >
        <div
          className="barbermasters__modal barbermasters__modal--taller barbermasters__modal--access"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="barbermasters__modalHeader">
            <h3 className="barbermasters__modalTitle">
              {tm("title", { name: employeeName })}
            </h3>
            <button
              type="button"
              className="barbermasters__iconBtn"
              onClick={() => !empSaving && setAccessModalOpen(false)}
              aria-label={t("common.close")}
              disabled={empSaving}
            >
              <FaTimes />
            </button>
          </div>

          <div className="barbermasters__form barbermasters__form--access">
            {showWarehouseWholesaleSection && (
              <div className="barbermasters__accessWarehouse">
                <h4 className="barbermasters__accessWarehouse-title">
                  {t("crm.employees.warehouseAgent")}
                </h4>

                {warehouseMembershipLoading ? (
                  <div className="barbermasters__accessWarehouse-muted">
                    {tm("loadingAgentSettings")}
                  </div>
                ) : warehouseMembership ? (
                  <>
                    <label className="barbermasters__label">
                      {tm("wholesaleSales")}
                    </label>
                    <div className="barbermasters__seg">
                      <button
                        type="button"
                        className={`barbermasters__segBtn ${
                          !canSellWholesale ? "is-active" : ""
                        }`}
                        onClick={() => onCanSellWholesaleChange?.(false)}
                        disabled={empSaving}
                      >
                        {tm("wholesalePrice")}
                      </button>
                      <button
                        type="button"
                        className={`barbermasters__segBtn ${
                          canSellWholesale ? "is-active" : ""
                        }`}
                        onClick={() => onCanSellWholesaleChange?.(true)}
                        disabled={empSaving}
                      >
                        {tm("agentPrice")}
                      </button>
                    </div>
                    <div className="barbermasters__help">
                      {tm("wholesaleHelp")}
                    </div>
                  </>
                ) : (
                  <div className="barbermasters__accessWarehouse-muted">
                    {tm("notAgentYet")}
                  </div>
                )}
              </div>
            )}

            <AccessList
              employeeAccesses={accessModalAccesses}
              onSaveAccesses={handleSaveEmployeeAccesses}
              role={accessModalEmployee.role}
              sectorName={company?.sector?.name}
              profile={profile}
              tariff={tariff || company?.subscription_plan?.name}
              company={company}
              isModalMode={true}
            />
          </div>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default EmployeeAccessModal;
