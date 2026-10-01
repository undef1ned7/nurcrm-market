import BranchMultiSelect from "./BranchMultiSelect";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import BarberMastersPortal from "./BarberMastersPortal";

const EmployeeCreateModal = ({
  empCreateOpen,
  empSaving,
  setEmpCreateOpen,
  empAlerts,
  empFieldErrors,
  empForm,
  setEmpForm,
  submitEmployeeCreate,
  company,
  roleOptions,
  showBranchSelect,
  branches,
  RoleSelect,
}) => {
  const { t } = useTranslation();
  const tc = (k: string): string => t(`crm.employees.createModal.${k}`) as string;
  const te = (k: string): string => t(`crm.employees.editModal.${k}`) as string;

  if (!empCreateOpen) return null;

  const isSawmill = company?.sector?.name === "Пилорама";

  return (
    <BarberMastersPortal wrapperId="barbermasters-employee-create">
      <div
        className="barbermasters__overlay"
        onClick={() => !empSaving && setEmpCreateOpen(false)}
      >
        <div
          className="barbermasters__modal barbermasters__modal--employee"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="barbermasters-employee-create-title"
        >
          <div className="barbermasters__modalHeader">
            <div className="barbermasters__modalHeading">
              <h3
                id="barbermasters-employee-create-title"
                className="barbermasters__modalTitle"
              >
                {tc("title")}
              </h3>
              <p className="barbermasters__modalSubtitle">{tc("subtitle")}</p>
            </div>
            <button
              className="barbermasters__iconBtn"
              onClick={() => !empSaving && setEmpCreateOpen(false)}
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
            onSubmit={submitEmployeeCreate}
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
                  {te("firstName")} <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="first_name"
                  className={`barbermasters__input ${
                    empFieldErrors.first_name
                      ? "barbermasters__input--invalid"
                      : ""
                  }`}
                  placeholder={te("firstName")}
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
                  {te("lastName")} <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="last_name"
                  className={`barbermasters__input ${
                    empFieldErrors.last_name
                      ? "barbermasters__input--invalid"
                      : ""
                  }`}
                  placeholder={te("lastName")}
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
                      {te("carNumber")} <b className="barbermasters__req">*</b>
                    </span>
                    <input
                      className={`barbermasters__input ${
                        empFieldErrors.track_number
                          ? "barbermasters__input--invalid"
                          : ""
                      }`}
                      placeholder={te("carNumber")}
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
                      {te("phone")} <b className="barbermasters__req">*</b>
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
                  {te("role")} <b className="barbermasters__req">*</b>
                </span>
                <RoleSelect
                  options={roleOptions}
                  value={empForm.roleChoice}
                  onChange={(key) =>
                    setEmpForm((p) => ({ ...p, roleChoice: key }))
                  }
                  placeholder={te("rolePlaceholder")}
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
                  <span className="barbermasters__label">{te("branch")}</span>
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
                    emptyLabel={te("branchNotSelected")}
                  />
                </div>
              )}
            </div>

            <div className="barbermasters__footer">
              <button
                type="button"
                className="barbermasters__btn barbermasters__btn--secondary"
                onClick={() => setEmpCreateOpen(false)}
                disabled={empSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="barbermasters__btn barbermasters__btn--primary"
                disabled={empSaving}
              >
                {empSaving ? t("common.saving") : tc("submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default EmployeeCreateModal;
