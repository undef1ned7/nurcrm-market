import BranchMultiSelect from "./BranchMultiSelect";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import BarberMastersPortal from "./BarberMastersPortal";

const EmployeeEditModal = ({
  empEditOpen,
  empSaving,
  setEmpEditOpen,
  empAlerts,
  empFieldErrors,
  empForm,
  setEmpForm,
  submitEmployeeEdit,
  company,
  roleOptions,
  showBranchSelect,
  branches,
  RoleSelect,
}) => {
  const { t } = useTranslation();
  const tm = (k: string): string => t(`crm.employees.editModal.${k}`) as string;
  if (!empEditOpen) return null;

  const isSawmill = company?.sector?.name === "Пилорама";

  return (
    <BarberMastersPortal wrapperId="barbermasters-employee-edit" onEscape={() => !empSaving && setEmpEditOpen(false)}>
      <div
        className="barbermasters__overlay"
        onClick={() => !empSaving && setEmpEditOpen(false)}
      >
        <div
          className="barbermasters__modal barbermasters__modal--employee"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="barbermasters-employee-edit-title"
        >
          <div className="barbermasters__modalHeader">
            <div className="barbermasters__modalHeading">
              <h3
                id="barbermasters-employee-edit-title"
                className="barbermasters__modalTitle"
              >
                {tm("title")}
              </h3>
              <p className="barbermasters__modalSubtitle">
                {tm("subtitle")}
              </p>
            </div>
            <button
              className="barbermasters__iconBtn"
              onClick={() => !empSaving && setEmpEditOpen(false)}
              aria-label={t("common.close")}
              type="button"
            >
              <FaTimes />
            </button>
          </div>

          {empAlerts.length > 0 && (
            <div
              className="barbermasters__alert barbermasters__alert--inModal"
              role="alert"
            >
              {empAlerts.length === 1 ? (
                empAlerts[0]
              ) : (
                <ul>
                  {empAlerts.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form
            className="barbermasters__form"
            onSubmit={submitEmployeeEdit}
            noValidate
          >
            <div className="barbermasters__grid barbermasters__grid--employee">
              <label
                className={`barbermasters__field ${
                  empFieldErrors.first_name
                    ? "barbermasters__field--invalid"
                    : ""
                }`}
              >
                <span className="barbermasters__label">
                  {tm("firstName")} <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="first_name"
                  className={`barbermasters__input ${
                    empFieldErrors.first_name
                      ? "barbermasters__input--invalid"
                      : ""
                  }`}
                  placeholder={tm("firstName")}
                  value={empForm.first_name}
                  onChange={(e) =>
                    setEmpForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                  required
                  autoComplete="given-name"
                />
              </label>

              <label
                className={`barbermasters__field ${
                  empFieldErrors.last_name
                    ? "barbermasters__field--invalid"
                    : ""
                }`}
              >
                <span className="barbermasters__label">
                  {tm("lastName")} <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="last_name"
                  className={`barbermasters__input ${
                    empFieldErrors.last_name
                      ? "barbermasters__input--invalid"
                      : ""
                  }`}
                  placeholder={tm("lastName")}
                  value={empForm.last_name}
                  onChange={(e) =>
                    setEmpForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                  required
                  autoComplete="family-name"
                />
              </label>

              <label
                className={`barbermasters__field barbermasters__field--full ${
                  empFieldErrors.email ? "barbermasters__field--invalid" : ""
                }`}
              >
                <span className="barbermasters__label">
                  Email <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="email"
                  type="email"
                  className={`barbermasters__input ${
                    empFieldErrors.email ? "barbermasters__input--invalid" : ""
                  }`}
                  placeholder="user@mail.com"
                  value={empForm.email}
                  onChange={(e) =>
                    setEmpForm((p) => ({ ...p, email: e.target.value }))
                  }
                  required
                  autoComplete="email"
                />
              </label>

              {isSawmill && (
                <>
                  <label
                    className={`barbermasters__field ${
                      empFieldErrors.track_number
                        ? "barbermasters__field--invalid"
                        : ""
                    }`}
                  >
                    <span className="barbermasters__label">
                      {tm("carNumber")} <b className="barbermasters__req">*</b>
                    </span>
                    <input
                      className={`barbermasters__input ${
                        empFieldErrors.track_number
                          ? "barbermasters__input--invalid"
                          : ""
                      }`}
                      placeholder={tm("carNumber")}
                      value={empForm.track_number}
                      onChange={(e) =>
                        setEmpForm((p) => ({
                          ...p,
                          track_number: e.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label
                    className={`barbermasters__field ${
                      empFieldErrors.phone_number
                        ? "barbermasters__field--invalid"
                        : ""
                    }`}
                  >
                    <span className="barbermasters__label">
                      {tm("phone")} <b className="barbermasters__req">*</b>
                    </span>
                    <input
                      className={`barbermasters__input ${
                        empFieldErrors.phone_number
                          ? "barbermasters__input--invalid"
                          : ""
                      }`}
                      placeholder="+996…"
                      value={empForm.phone_number}
                      onChange={(e) =>
                        setEmpForm((p) => ({
                          ...p,
                          phone_number: e.target.value,
                        }))
                      }
                      required
                      autoComplete="tel"
                    />
                  </label>
                </>
              )}

              <div
                className={`barbermasters__field ${
                  showBranchSelect ? "" : "barbermasters__field--full"
                } ${
                  empFieldErrors.roleChoice
                    ? "barbermasters__field--invalid"
                    : ""
                }`}
              >
                <span className="barbermasters__label">
                  {tm("role")} <b className="barbermasters__req">*</b>
                </span>
                <RoleSelect
                  options={roleOptions}
                  value={empForm.roleChoice}
                  onChange={(key) =>
                    setEmpForm((p) => ({ ...p, roleChoice: key }))
                  }
                  placeholder={tm("rolePlaceholder")}
                  className="barbermasters__roleSelect"
                />
                <input
                  name="roleChoice"
                  value={empForm.roleChoice}
                  hidden
                  readOnly
                />
              </div>

              {showBranchSelect && (
                <div
                  className={`barbermasters__field ${
                    empFieldErrors.branch
                      ? "barbermasters__field--invalid"
                      : ""
                  }`}
                >
                  <span className="barbermasters__label">{tm("branch")}</span>
                  <BranchMultiSelect
                    branches={branches}
                    value={empForm.branches || []}
                    onChange={(next) =>
                      setEmpForm((p) => ({
                        ...p,
                        branches: next,
                        branch: next[0] || "",
                      }))
                    }
                    emptyLabel={tm("branchNotSelected")}
                  />
                </div>
              )}
            </div>

            <div className="barbermasters__footer">
              <button
                type="button"
                className="barbermasters__btn barbermasters__btn--secondary"
                onClick={() => setEmpEditOpen(false)}
                disabled={empSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="barbermasters__btn barbermasters__btn--primary"
                disabled={empSaving}
              >
                {empSaving ? t("common.saving") : tm("saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default EmployeeEditModal;
