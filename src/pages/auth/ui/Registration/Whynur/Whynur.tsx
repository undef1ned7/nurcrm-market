import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Whynur.module.scss';

const WHY_OPTION_KEYS = [
  'organizeSales',
  'manageTeam',
  'clientBase',
  'automateDeals',
  'unifyMessengers',
  'teamChat',
  'undecided',
] as const;

const ROLE_OPTION_KEYS = [
  'owner',
  'director',
  'marketing',
  'salesManager',
  'other',
] as const;

const Whynur = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          <h1 className={styles.whynur__title}>{t('auth.registration.whyTitle')}</h1>
          <p className={styles.whynur__subtitle}>{t('auth.registration.whySubtitle')}</p>
          <div className={styles.whynur__options}>
            {WHY_OPTION_KEYS.map((key) => (
              <label className={styles.whynur__option} key={key}>
                <input type="checkbox" /> {t(`auth.registration.options.${key}`)}
              </label>
            ))}
          </div>
        </>
      );
    } else if (step === 2) {
      return (
        <>
          <h1 className={styles.whynur__title}>{t('auth.registration.roleTitle')}</h1>
          <p className={styles.whynur__subtitle}>{t('auth.registration.roleSubtitle')}</p>
          <div className={styles.whynur__options}>
            {ROLE_OPTION_KEYS.map((key) => (
              <label className={styles.whynur__option} key={key}>
                <input type="radio" name="role" /> {t(`auth.registration.options.${key}`)}
              </label>
            ))}
          </div>
        </>
      );
    } else if (step === 3) {
      return (
        <>
          <h1 className={styles.whynur__title}>Как работает ваш бизнес?</h1>
          <p className={styles.whynur__subtitle}>Зная детали, мы можем лучше вам помочь</p>
          <div className={styles.whynur__options}>
            <select className={styles.whynur__select}>
              <option>В какой сфере работаете?</option>
              <option>IT</option>
              <option>Услуги</option>
              <option>Торговля</option>
            </select>
            <select className={styles.whynur__select}>
              <option>Сколько человек будет работать в CRM?</option>
              <option>1</option>
              <option>2-5</option>
              <option>6-10</option>
            </select>
            <select className={styles.whynur__select}>
              <option>Есть ли отдел продаж?</option>
              <option>Да</option>
              <option>Нет</option>
            </select>
            <select className={styles.whynur__select}>
              <option>Пробовали раньше внедрять CRM?</option>
              <option>Да</option>
              <option>Нет</option>
            </select>
          </div>
        </>
      );
    }
  };

  return (
    <div className={styles.whynur}>
      {renderStep()}
      <div className={styles.whynur__navigation}>
        {step > 1 && (
          <span className={styles.whynur__navPrev} onClick={() => setStep(step - 1)}>
            ←
          </span>
        )}
        <span className={styles.whynur__navText}>{step} из 3</span>
        {step < 3 ? (
          <button className={styles.whynur__nextButton} onClick={() => setStep(step + 1)}>
            Далее
          </button>
        ) : (
          <button className={styles.whynur__nextButton} onClick={() => setIsModalOpen(true)}>
            Завершить
          </button>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.whynur__modal}>
          <div className={styles.whynur__modalContent}>
            <h1 className={styles.whynur__title}>Создать аккаунт</h1>
            <div className={styles.whynur__successContent}>
              <p className={styles.whynur__successText}>Спасибо, что выбрали нашу CRM!</p>
              <span className={styles.whynur__successCheck}>✔</span>
              <p className={styles.whynur__successText}>
                Система автоматизирует ваши сделки и процессы в компании, научит управлять клиентской базой и поможет
                продавать больше. Сейчас расскажем, что умеет система и как всё устроено в вашей CRM. А потом покажем
                пару фокусов. Просим чуть-чуть внимания и 3 минуты вашего времени.
              </p>
            </div>
            <button className={styles.whynur__nextButton} onClick={() => setIsModalOpen(false)}>
              Погнали, я готов!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Whynur;
