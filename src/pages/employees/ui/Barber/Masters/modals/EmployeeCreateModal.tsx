import { FaTimes } from "react-icons/fa";
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
                Новый сотрудник
              </h3>
              <p className="barbermasters__modalSubtitle">
                Заполните данные — логин и пароль появятся после создания
              </p>
            </div>
            <button
              className="barbermasters__iconBtn"
              onClick={() => !empSaving && setEmpCreateOpen(false)}
              aria-label="Закрыть"
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
                  Имя <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="first_name"
                  className={`barbermasters__input ${
                    empFieldErrors.first_name
                      ? "barbermasters__input--invalid"
                      : ""
                  }`}
                  placeholder="Имя"
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
                  Фамилия <b className="barbermasters__req">*</b>
                </span>
                <input
                  name="last_name"
                  className={`barbermasters__input ${
                    empFieldErrors.last_name
                      ? "barbermasters__input--invalid"
                      : ""
                  }`}
                  placeholder="Фамилия"
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
                      Номер машины <b className="barbermasters__req">*</b>
                    </span>
                    <input
                      className={`barbermasters__input ${
                        empFieldErrors.track_number
                          ? "barbermasters__input--invalid"
                          : ""
                      }`}
                      placeholder="Номер машины"
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
                      Телефон <b className="barbermasters__req">*</b>
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
                  Роль <b className="barbermasters__req">*</b>
                </span>
                <RoleSelect
                  options={roleOptions}
                  value={empForm.roleChoice}
                  onChange={(key) =>
                    setEmpForm((p) => ({ ...p, roleChoice: key }))
                  }
                  placeholder="Выберите роль"
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
                  <span className="barbermasters__label">Филиал</span>
                  <RoleSelect
                    options={[
                      { key: "", label: "Не выбран" },
                      ...branches.map((b) => ({
                        key: b.id,
                        label: b.name || "Без названия",
                      })),
                    ]}
                    value={empForm.branch || ""}
                    onChange={(key) =>
                      setEmpForm((p) => ({ ...p, branch: key }))
                    }
                    placeholder="Выберите филиал"
                    className="barbermasters__roleSelect"
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
                Отмена
              </button>
              <button
                type="submit"
                className="barbermasters__btn barbermasters__btn--primary"
                disabled={empSaving}
              >
                {empSaving ? "Сохранение…" : "Создать сотрудника"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BarberMastersPortal>
  );
};

export default EmployeeCreateModal;
