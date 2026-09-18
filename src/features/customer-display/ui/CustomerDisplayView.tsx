import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeCustomerDisplay } from "../lib/channel";
import {
  getCustomerDisplaySlides,
  getCustomerDisplayTheme,
  getCustomerDisplayWelcome,
} from "../model/settings";
import type { CustomerDisplayMessage } from "../model/types";
import "./CustomerDisplayView.scss";

const formatMoney = (value?: number) =>
  `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} сом`;

const formatDueDate = (iso?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso || "");
};

export function CustomerDisplayView({
  companyName,
  logoUrl,
}: {
  companyName?: string;
  logoUrl?: string;
}) {
  const { t } = useTranslation();
  const fallbackWelcome = getCustomerDisplayWelcome(companyName);
  const [message, setMessage] = useState<CustomerDisplayMessage>({
    type: "idle",
    welcomeText: fallbackWelcome,
    companyName,
    logoUrl,
    slides: getCustomerDisplaySlides(),
  });
  const [ageCheck, setAgeCheck] = useState<{ productName?: string } | null>(
    null,
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [theme, setTheme] = useState(getCustomerDisplayTheme);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "market_customer_display_theme") {
        setTheme(getCustomerDisplayTheme());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    return subscribeCustomerDisplay((next) => {
      if (next.type === "age-check") {
        setAgeCheck({ productName: next.productName });
        return;
      }
      if (next.type === "age-check-dismiss") {
        setAgeCheck(null);
        return;
      }
      if (
        next.type === "payment" ||
        next.type === "thanks" ||
        next.type === "clear"
      ) {
        setAgeCheck(null);
      }
      setMessage(next);
      setSlideIndex(0);
    });
  }, []);

  useEffect(() => {
    if (message.type !== "thanks") return undefined;
    const ms = message.durationMs || 5000;
    const timer = window.setTimeout(() => {
      setMessage({
        type: "idle",
        welcomeText: fallbackWelcome,
        companyName,
        logoUrl,
        slides: getCustomerDisplaySlides(),
      });
    }, ms);
    return () => window.clearTimeout(timer);
  }, [message, fallbackWelcome, companyName, logoUrl]);

  const slides = message.type === "idle" ? message.slides || [] : [];

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const idle = message.type === "idle" || message.type === "hello";
  const welcome =
    idle && "welcomeText" in message
      ? message.welcomeText || fallbackWelcome
      : fallbackWelcome;
  const shownLogo =
    idle && "logoUrl" in message ? message.logoUrl || logoUrl : logoUrl;

  const currentSlide = slides[slideIndex];
  const cartItems = message.type === "cart" ? message.items : [];
  const payInfo =
    message.type === "payment" || message.type === "thanks" ? message : null;
  const paid = payInfo?.paid;
  const change = payInfo?.change;
  const debt = payInfo?.debt;

  const title = useMemo(() => {
    if (message.type === "thanks") return t("crm.customerDisplay.thanks");
    if (message.type === "payment") return t("crm.customerDisplay.payment");
    if (message.type === "cart") return t("crm.customerDisplay.yourOrder");
    return welcome;
  }, [message, welcome, t]);

  return (
    <div
      className={`customer-display customer-display--${message.type} customer-display--${theme}${
        ageCheck ? " customer-display--age-check" : ""
      }`}
    >
      {currentSlide?.imageUrl ? (
        <div
          className="customer-display__slide"
          style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
          aria-hidden="true"
        />
      ) : null}
      <div className="customer-display__scrim" />
      <div className="customer-display__content">
        <header className="customer-display__brand">
          {shownLogo ? (
            <img src={shownLogo} alt="" className="customer-display__logo" />
          ) : (
            <div className="customer-display__logo-fallback" aria-hidden>
              {(companyName || "N").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="customer-display__company">
              {companyName || "NurCRM"}
            </p>
            <h1 className="customer-display__title">{title}</h1>
          </div>
        </header>

        {message.type === "cart" ? (
          <>
            <ul className="customer-display__items">
              {cartItems.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <span className="customer-display__item-name">{item.name}</span>
                  <span className="customer-display__item-qty">
                    {item.qty} × {formatMoney(item.price)}
                  </span>
                  {item.discount ? (
                    <span className="customer-display__item-discount">
                      −{formatMoney(item.discount)}
                    </span>
                  ) : null}
                  <strong>{formatMoney(item.lineTotal)}</strong>
                </li>
              ))}
            </ul>
            <div className="customer-display__total">
              <span>{t("crm.customerDisplay.toPay")}</span>
              <strong>{formatMoney(message.total)}</strong>
            </div>
          </>
        ) : null}

        {message.type === "payment" ? (
          <div className="customer-display__pay">
            <p>{t("crm.customerDisplay.paymentHint")}</p>
            <strong>{formatMoney(message.total)}</strong>
          </div>
        ) : null}

        {message.type === "thanks" ? (
          <div className="customer-display__thanks">
            {message.total ? <strong>{formatMoney(message.total)}</strong> : null}
            <p>{t("crm.customerDisplay.seeYouAgain")}</p>
          </div>
        ) : null}

        {payInfo && (paid != null || change != null) ? (
          <div className="customer-display__cash">
            {paid != null ? (
              <div className="customer-display__cash-row">
                <span>{t("crm.customerDisplay.cashReceived")}</span>
                <strong>{formatMoney(paid)}</strong>
              </div>
            ) : null}
            {change != null ? (
              <div className="customer-display__cash-row customer-display__cash-row--change">
                <span>{t("crm.customerDisplay.change")}</span>
                <strong>{formatMoney(change)}</strong>
              </div>
            ) : null}
          </div>
        ) : null}

        {payInfo && debt ? (
          <div className="customer-display__debt">
            <p className="customer-display__debt-title">
              {t("crm.customerDisplay.debtTitle")}
            </p>
            <div className="customer-display__debt-meta">
              {debt.customerName ? (
                <div className="customer-display__debt-row">
                  <span>{t("crm.customerDisplay.debtCustomer")}</span>
                  <strong>{debt.customerName}</strong>
                </div>
              ) : null}
              {debt.prepayment ? (
                <div className="customer-display__debt-row">
                  <span>{t("crm.customerDisplay.debtPrepayment")}</span>
                  <strong>{formatMoney(debt.prepayment)}</strong>
                </div>
              ) : null}
              {debt.totalDebt != null ? (
                <div className="customer-display__debt-row customer-display__debt-row--total">
                  <span>{t("crm.customerDisplay.debtRemaining")}</span>
                  <strong>{formatMoney(debt.totalDebt)}</strong>
                </div>
              ) : null}
            </div>
            {debt.installments && debt.installments.length > 0 ? (
              <table className="customer-display__debt-schedule">
                <thead>
                  <tr>
                    <th>{t("crm.customerDisplay.debtInstallmentNo")}</th>
                    <th>{t("crm.customerDisplay.debtInstallmentDate")}</th>
                    <th>{t("crm.customerDisplay.debtInstallmentAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {debt.installments.map((item) => (
                    <tr key={item.number}>
                      <td>{item.number}</td>
                      <td>{formatDueDate(item.dueDate)}</td>
                      <td>{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        ) : null}

        {idle && currentSlide?.caption ? (
          <p className="customer-display__caption">{currentSlide.caption}</p>
        ) : null}
      </div>
      {ageCheck ? (
        <div className="customer-display__age-check" role="alert">
          <span className="customer-display__age-check-mark">18+</span>
          <h2 className="customer-display__age-check-title">
            {t("crm.customerDisplay.ageCheckTitle")}
          </h2>
          {ageCheck.productName ? (
            <p className="customer-display__age-check-product">
              {ageCheck.productName}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
