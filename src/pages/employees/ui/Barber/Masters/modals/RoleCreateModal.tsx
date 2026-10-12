import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import BarberMastersPortal from "./BarberMastersPortal";

const RoleCreateModal = ({
  roleCreateOpen,
  roleCreateSaving,
  setRoleCreateOpen,
  submitRoleCreate,
  roleCreateName,
  setRoleCreateName,
  roleCreateErr,
}) => {
  const { t } = useTranslation();
  if (!roleCreateOpen) return null;

  return (
    <BarberMastersPortal wrapperId="barbermasters-rolecreatemodal" onEscape={() => !roleCreateSaving && setRoleCreateOpen(false)}>
    <div
      className="barbermasters__overlay"
      onClick={() => !roleCreateSaving && setRoleCreateOpen(false)}
    >
      <div
        className="barbermasters__modal barbermasters__modal--form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="barbermasters__modalHeader">
          <h3 className="barbermasters__modalTitle">
            {t("crm.employees.roleModal.newTitle")}
          </h3>
          <button
            className="barbermasters__iconBtn"
            onClick={() => !roleCreateSaving && setRoleCreateOpen(false)}
            aria-label={t("common.close")}
          >
            <FaTimes />
          </button>
        </div>

        <form
          className="barbermasters__form"
          onSubmit={submitRoleCreate}
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
                placeholder={t("crm.employees.roleModal.namePlaceholder")}
                value={roleCreateName}
                onChange={(e) => setRoleCreateName(e.target.value)}
                required
              />
            </label>
          </div>

          {!!roleCreateErr && (
            <div className="barbermasters__alert barbermasters__alert--inModal">
              {roleCreateErr}
            </div>
          )}

          <div className="barbermasters__footer">
            <span className="barbermasters__spacer" />
            <div className="barbermasters__footerRight">
              <button
                type="button"
                className="barbermasters__btn barbermasters__btn--secondary"
                onClick={() => setRoleCreateOpen(false)}
                disabled={roleCreateSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="barbermasters__btn barbermasters__btn--primary"
                disabled={roleCreateSaving}
              >
                {roleCreateSaving
                  ? t("common.saving")
                  : t("crm.employees.roleModal.submitCreate")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </BarberMastersPortal>
  );
};

export default RoleCreateModal;
