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
            <h3 className="barbermasters__modalTitle">Агент склада</h3>
            <button
              type="button"
              className="barbermasters__iconBtn"
              onClick={onClose}
              aria-label="Закрыть"
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
                      {fullName(employee) || "Без имени"}
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
                    Текущее назначение:{" "}
                    <strong>
                      {getWarehouseAgentLabel(
                        existingMembership.assigned_warehouse,
                      )}
                    </strong>
                    {existingMembership.common_access_enabled && (
                      <>
                        {" "}
                        · общий доступ:{" "}
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
                  Ограничить доступ одним складом
                </label>
                <select
                  className="barbermasters__input"
                  value={assignedWarehouse}
                  onChange={(e) => setAssignedWarehouse(e.target.value)}
                  disabled={saving || warehousesLoading || membershipLoading}
                >
                  <option value="">
                    {warehousesLoading || membershipLoading
                      ? "Загрузка…"
                      : "Все склады компании"}
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name || w.title || w.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">Доступ к складу</label>
                <div className="barbermasters__seg">
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      !commonEnabled ? "is-active" : ""
                    }`}
                    onClick={() => setCommonEnabled(false)}
                    disabled={saving}
                  >
                    Только свои остатки
                  </button>
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      commonEnabled ? "is-active" : ""
                    }`}
                    onClick={() => setCommonEnabled(true)}
                    disabled={saving}
                  >
                    Общий прайс склада
                  </button>
                </div>
              </div>

              {commonEnabled && (
                <div className="barbermasters__field barbermasters__field--full">
                  <label className="barbermasters__label">
                    Склады общего доступа{" "}
                    <span className="barbermasters__req">*</span>
                  </label>
                  {warehousesLoading || membershipLoading ? (
                    <div className="barbermasters__help">Загрузка…</div>
                  ) : warehouses.length === 0 ? (
                    <div className="barbermasters__help">
                      У компании нет складов
                    </div>
                  ) : (
                    <div
                      className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3"
                      role="group"
                      aria-label="Склады общего доступа"
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
                    Отметьте склады, остатки которых агент будет видеть в общем
                    прайс‑листе. Можно выбрать несколько.
                  </div>
                </div>
              )}

              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">Оптовые продажи</label>
                <div className="barbermasters__seg">
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      !canSellWholesale ? "is-active" : ""
                    }`}
                    onClick={() => setCanSellWholesale(false)}
                    disabled={saving}
                  >
                    Оптовая цена
                  </button>
                  <button
                    type="button"
                    className={`barbermasters__segBtn ${
                      canSellWholesale ? "is-active" : ""
                    }`}
                    onClick={() => setCanSellWholesale(true)}
                    disabled={saving}
                  >
                    Цена агента
                  </button>
                </div>
                <div className="barbermasters__help">
                  Агент сможет создавать продажи с переключателем «Опт».
                </div>
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
                  ? "Сохранение…"
                  : existingMembership
                    ? "Сохранить изменения"
                    : "Назначить агентом"}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={onClose}
                disabled={saving}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default WarehouseAgentModal;
