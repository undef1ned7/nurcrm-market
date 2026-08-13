import { useEffect, useMemo, useState } from "react";
import { subscribeCustomerDisplay } from "../lib/channel";
import {
  getCustomerDisplaySlides,
  getCustomerDisplayWelcome,
} from "../model/settings";
import type { CustomerDisplayMessage } from "../model/types";
import "./CustomerDisplayView.scss";

const formatMoney = (value?: number) =>
  `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} сом`;

export function CustomerDisplayView({
  companyName,
  logoUrl,
}: {
  companyName?: string;
  logoUrl?: string;
}) {
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
  const title = useMemo(() => {
    if (message.type === "thanks") return "Спасибо за покупку!";
    if (message.type === "payment") return "Оплата";
    if (message.type === "cart") return "Ваш заказ";
    return welcome;
  }, [message, welcome]);

  return (
    <div
      className={`customer-display customer-display--${message.type}${
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
              <span>К оплате</span>
              <strong>{formatMoney(message.total)}</strong>
            </div>
          </>
        ) : null}

        {message.type === "payment" ? (
          <div className="customer-display__pay">
            <p>Проверьте сумму и завершите оплату у кассира</p>
            <strong>{formatMoney(message.total)}</strong>
          </div>
        ) : null}

        {message.type === "thanks" ? (
          <div className="customer-display__thanks">
            {message.total ? <strong>{formatMoney(message.total)}</strong> : null}
            <p>Ждём вас снова</p>
          </div>
        ) : null}

        {idle && currentSlide?.caption ? (
          <p className="customer-display__caption">{currentSlide.caption}</p>
        ) : null}
      </div>
      {ageCheck ? (
        <div className="customer-display__age-check" role="alert">
          <span className="customer-display__age-check-mark">18+</span>
          <h2 className="customer-display__age-check-title">Вам есть 18?</h2>
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
