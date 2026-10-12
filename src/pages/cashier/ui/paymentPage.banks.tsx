import type { PaymentBank } from "./paymentPage.types";
import { ObankLogo } from "./paymentPage.ObankLogo";

/** Банки Кыргызстана. id соответствует checkout (mbank, optima, obank, bakai). */
export const PAYMENT_BANKS: PaymentBank[] = [
  {
    id: "mbank",
    name: "МБанк",
    logo: "https://mbank.kg/_next/static/media/logo.6cee92d7.svg",
  },
  {
    id: "optima",
    name: "Оптима Банк",
    logo: "https://economist.kg/content/images/size/w2400/format/webp/wp-content/uploads/2020/06/banki-optima-bank-1.jpg",
  },
  {
    id: "obank",
    name: "О-Банк",
    logo: <ObankLogo />,
  },
  {
    id: "bakai",
    name: "Бакай Банк",
    logo: null,
  },
  {
    id: "demir",
    name: "Демир Банк",
    logo: "https://www.demirbank.kg/assets/logo-without-slogan-f5a092c7.svg",
  },
  { id: "other", name: "Другой банк", logo: null },
];
