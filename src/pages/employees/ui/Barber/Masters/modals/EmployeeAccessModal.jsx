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
  if (!accessModalOpen || !accessModalEmployee) return null;

  const showWarehouseWholesaleSection = isWarehouseSector && isOwnerOrAdmin;
  const employeeName =
    accessModalEmployee.first_name && accessModalEmployee.last_name
      ? `${accessModalEmployee.first_name} ${accessModalEmployee.last_name}`
      : accessModalEmployee.email || "Сотрудник";

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
              Управление доступами: {employeeName}
            </h3>
            <button
              type="button"
              className="barbermasters__iconBtn"
              onClick={() => !empSaving && setAccessModalOpen(false)}
              aria-label="Закрыть"
              disabled={empSaving}
            >
              <FaTimes />
            </button>
          </div>

          <div className="barbermasters__form barbermasters__form--access">
            {showWarehouseWholesaleSection && (
              <div className="barbermasters__accessWarehouse">
                <h4 className="barbermasters__accessWarehouse-title">
                  Агент склада
                </h4>

                {warehouseMembershipLoading ? (
                  <div className="barbermasters__accessWarehouse-muted">
                    Загрузка настроек агента…
                  </div>
                ) : warehouseMembership ? (
                  <>
                    <label className="barbermasters__label">
                      Оптовые продажи
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
                        Оптовая цена
                      </button>
                      <button
                        type="button"
                        className={`barbermasters__segBtn ${
                          canSellWholesale ? "is-active" : ""
                        }`}
                        onClick={() => onCanSellWholesaleChange?.(true)}
                        disabled={empSaving}
                      >
                        Цена агента
                      </button>
                    </div>
                    <div className="barbermasters__help">
                      Сохраняется вместе с доступами. Агент сможет создавать
                      продажи с переключателем «Опт».
                    </div>
                  </>
                ) : (
                  <div className="barbermasters__accessWarehouse-muted">
                    Сотрудник ещё не назначен агентом склада. Сначала нажмите
                    «Агент склада» в карточке сотрудника.
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
