import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./Create.module.scss";

const Create = ({ onNextStep }) => {
  const { t } = useTranslation();
  const [showSuccess, setShowSuccess] = useState(false);

  if (showSuccess) {
    return (
      <div className={styles.success}>
        <div className={styles.success__content}>
          <p className={styles.success__title}>{t("auth.registration.successTitle")}</p>
          <span className={styles.success__check}>✔</span>
          <p className={styles.success__text}>{t("auth.registration.successText")}</p>
        </div>
        <button className={styles.success__button} onClick={onNextStep}>
          {t("auth.registration.startUsing")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.create}>
      <h1 className={styles.create__title}>{t("auth.registration.createTitle")}</h1>
      <input className={styles.create__input} type="text" placeholder={t("auth.registration.fullName")} />
      <input className={styles.create__input} type="email" placeholder={t("auth.login.email")} />
      <input className={styles.create__input} type="tel" placeholder={t("auth.registration.phone")} />
      <button className={styles.create__button} onClick={() => setShowSuccess(true)}>
        {t("auth.registration.create")}
      </button>
    </div>
  );
};

export default Create;
