import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import BarberMastersPortal from "./BarberMastersPortal";

const RoleEditModal = ({
  roleEditOpen,
  roleEditSaving,
  setRoleEditOpen,
  submitRoleEdit,
  roleEditName,
  setRoleEditName,
  roleEditErr,
}) => {
  const { t } = useTranslation();
  if (!roleEditOpen) return null;

  return (
    <BarberMastersPortal wrapperId="barbermasters-roleeditmodal" onEscape={() => !roleEditSaving && setRoleEditOpen(false)}>
    <div
      className="barbermasters__overlay"
      onClick={() => !roleEditSaving && setRoleEditOpen(false)}
    >
      <div
        className="barbermasters__modal barbermasters__modal--form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="barbermasters__modalHeader">
          <h3 className="barbermasters__modalTitle">
            {t("crm.employees.roleModal.editTitle")}
          </h3>
          <button
            className="barbermasters__iconBtn"
            onClick={() => !roleEditSaving && setRoleEditOpen(false)}
            aria-label={t("common.close")}
          >
            <FaTimes />
          </button>
        </div>

        {!!roleEditErr && (
          <div className="barbermasters__alert barbermasters__alert--inModal">
            {roleEditErr}
          </div>
        )}

        <form
          className="barbermasters__form"
          onSubmit={submitRoleEdit}
          noValidate
        >
          <div className="barbermasters__grid">
            <label className="barbermasters__field barbermasters__field--full">
              <span className="barbermasters__label">
                {t("crm.employees.roleModal.nameLabel")}{" "}
                <b className="barbermasters__req">*</b>
              </span>
              <input
                className="barbermasters__input"
                placeholder={t("crm.employees.roleModal.nameLabel")}
                value={roleEditName}
                onChange={(e) => setRoleEditName(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="barbermasters__footer">
            <span className="barbermasters__spacer" />
            <div className="barbermasters__footerRight">
              <button
                type="button"
                className="barbermasters__btn barbermasters__btn--secondary"
                onClick={() => setRoleEditOpen(false)}
                disabled={roleEditSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="barbermasters__btn barbermasters__btn--primary"
                disabled={roleEditSaving}
              >
                {roleEditSaving
                  ? t("common.saving")
                  : t("crm.employees.editModal.saveChanges")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </BarberMastersPortal>
  );
};

export default RoleEditModal;
