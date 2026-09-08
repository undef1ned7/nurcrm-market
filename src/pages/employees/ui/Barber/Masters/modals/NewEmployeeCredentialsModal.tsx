import { FaCheck, FaCopy, FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import BarberMastersPortal from "./BarberMastersPortal";

const NewEmployeeCredentialsModal = ({
  openLogin,
  setOpenLogin,
  employData,
  copied,
  copyToClipboard,
}) => {
  const { t } = useTranslation();
  if (!openLogin) return null;

  return (
    <BarberMastersPortal wrapperId="barbermasters-newemployeecredentialsmodal">
    <div className="barbermasters__overlay" onClick={() => setOpenLogin(false)}>
      <div className="barbermasters__modal" onClick={(e) => e.stopPropagation()}>
        <div className="barbermasters__modalHeader">
          <h3 className="barbermasters__modalTitle">
            {t("crm.employees.credentials.title")}
          </h3>
          <button
            className="barbermasters__iconBtn"
            onClick={() => setOpenLogin(false)}
            aria-label={t("common.close")}
          >
            <FaTimes />
          </button>
        </div>
        <div className="barbermasters__content">
          <p className="barbermasters__label flex justify-between">
            <b>
              {t("crm.employees.credentials.loginLabel")}: {employData?.email}
            </b>
            <button
              className="barbermasters__iconBtn barbermasters__copyBtn"
              onClick={() => copyToClipboard(employData?.email || "", "email")}
              aria-label={t("crm.employees.credentials.copyLogin")}
              title={
                copied === "email" ? t("common.copied") : t("common.copy")
              }
            >
              {copied === "email" ? <FaCheck /> : <FaCopy />}
            </button>
          </p>

          <p className="barbermasters__label flex justify-between">
            <b>
              {t("crm.employees.credentials.passwordLabel")}:{" "}
              {employData?.generated_password}
            </b>
            <button
              className="barbermasters__iconBtn barbermasters__copyBtn"
              onClick={() =>
                copyToClipboard(employData?.generated_password || "", "password")
              }
              aria-label={t("crm.employees.credentials.copyPassword")}
              title={
                copied === "password" ? t("common.copied") : t("common.copy")
              }
            >
              {copied === "password" ? <FaCheck /> : <FaCopy />}
            </button>
          </p>
        </div>
      </div>
    </div>
    </BarberMastersPortal>
  );
};

export default NewEmployeeCredentialsModal;
