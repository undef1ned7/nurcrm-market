import { FaTimes } from "react-icons/fa";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import BarberMastersPortal from "./BarberMastersPortal";

const DeleteRoleModal = ({
  roleToDelete,
  setRoleToDelete,
  doRemoveRole,
  roleDeletingIds,
}) => {
  const { t } = useTranslation();
  if (!roleToDelete) return null;

  const busy = roleDeletingIds.has(roleToDelete.id);
  const name = roleToDelete.name || "—";

  return (
    <BarberMastersPortal wrapperId="barbermasters-delete-role" onEscape={() => !busy && setRoleToDelete(null)}>
      <div
        className="barbermasters__overlay"
        onClick={() => !busy && setRoleToDelete(null)}
      >
        <div
          className="barbermasters__modal barbermasters__modal--confirm"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="barbermasters-delete-role-title"
        >
          <div className="barbermasters__modalHeader">
            <div className="barbermasters__modalHeading">
              <h3
                id="barbermasters-delete-role-title"
                className="barbermasters__modalTitle"
              >
                {t("crm.employees.deleteRole.title")}
              </h3>
            </div>
            <button
              type="button"
              className="barbermasters__iconBtn"
              onClick={() => !busy && setRoleToDelete(null)}
              aria-label={t("common.close")}
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
                {t("crm.employees.deleteRole.lead", { name })}
              </p>
              <p className="barbermasters__confirmHint">
                {t("crm.employees.deleteRole.hint")}
              </p>
            </div>
          </div>

          <div className="barbermasters__footer">
            <button
              type="button"
              className="barbermasters__btn barbermasters__btn--secondary"
              onClick={() => setRoleToDelete(null)}
              disabled={busy}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="barbermasters__btn barbermasters__btn--danger"
              onClick={doRemoveRole}
              disabled={busy}
            >
              {busy ? t("common.deleting") : t("common.delete")}
            </button>
          </div>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default DeleteRoleModal;
