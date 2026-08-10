import { FaTimes } from "react-icons/fa";
import { AlertTriangle } from "lucide-react";
import BarberMastersPortal from "./BarberMastersPortal";

const DeleteEmployeeModal = ({
  empToDelete,
  setEmpToDelete,
  doRemoveEmployee,
  empDeletingIds,
  fullName,
}) => {
  if (!empToDelete) return null;

  const name = fullName(empToDelete) || empToDelete.email || "—";
  const busy = empDeletingIds.has(empToDelete.id);

  return (
    <BarberMastersPortal wrapperId="barbermasters-delete-employee">
      <div
        className="barbermasters__overlay"
        onClick={() => !busy && setEmpToDelete(null)}
      >
        <div
          className="barbermasters__modal barbermasters__modal--confirm"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="barbermasters-delete-employee-title"
        >
          <div className="barbermasters__modalHeader">
            <div className="barbermasters__modalHeading">
              <h3
                id="barbermasters-delete-employee-title"
                className="barbermasters__modalTitle"
              >
                Удалить сотрудника
              </h3>
            </div>
            <button
              type="button"
              className="barbermasters__iconBtn"
              onClick={() => !busy && setEmpToDelete(null)}
              aria-label="Закрыть"
              disabled={busy}
            >
              <FaTimes />
            </button>
          </div>

          <div className="barbermasters__confirmBody">
            <div
              className="barbermasters__confirmIcon"
              aria-hidden="true"
            >
              <AlertTriangle size={22} />
            </div>
            <div className="barbermasters__confirmText">
              <p className="barbermasters__confirmLead">
                Удалить «{name}»?
              </p>
              <p className="barbermasters__confirmHint">
                Действие необратимо. Доступ сотрудника к системе будет закрыт.
              </p>
            </div>
          </div>

          <div className="barbermasters__footer">
            <button
              type="button"
              className="barbermasters__btn barbermasters__btn--secondary"
              onClick={() => setEmpToDelete(null)}
              disabled={busy}
            >
              Отмена
            </button>
            <button
              type="button"
              className="barbermasters__btn barbermasters__btn--danger"
              onClick={doRemoveEmployee}
              disabled={busy}
            >
              {busy ? "Удаление…" : "Удалить"}
            </button>
          </div>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default DeleteEmployeeModal;
