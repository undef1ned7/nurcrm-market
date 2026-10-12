import { useEffect, useMemo } from "react";
import { useUser } from "@entities/user";
import { buildCustomerDisplayCartMessage } from "../lib/buildCartMessage";
import { publishCustomerDisplay } from "../lib/channel";
import {
  getCustomerDisplaySlides,
  getCustomerDisplayWelcome,
  isCustomerDisplayEnabled,
} from "./settings";
import type {
  CustomerDisplayDebtInfo,
  CustomerDisplayPhase,
} from "./types";

export function useCustomerDisplayPublisher({
  phase,
  cart,
  total,
  cartId,
  paid,
  change,
  debt,
}: {
  phase: CustomerDisplayPhase | "skip";
  cart?: unknown[] | null;
  total?: number;
  cartId?: string | number | null;
  /** Наличными получено (для экранов «Оплата» и «Спасибо»). */
  paid?: number;
  /** Сдача клиенту. */
  change?: number;
  /** Инфо о рассрочке/долге, если продажа в долг. */
  debt?: CustomerDisplayDebtInfo | null;
}) {
  const { company } = useUser();
  const companyName = String(company?.name || "").trim();
  const logoUrl = String(
    company?.logo || company?.logo_url || company?.image || "",
  ).trim();
  const welcomeText = useMemo(
    () => getCustomerDisplayWelcome(companyName),
    [companyName],
  );

  const debtKey = debt ? JSON.stringify(debt) : "";

  useEffect(() => {
    if (phase === "skip" || !isCustomerDisplayEnabled()) return;

    const paidNum = Number.isFinite(Number(paid)) ? Number(paid) : undefined;
    const changeNum = Number.isFinite(Number(change))
      ? Number(change)
      : undefined;
    const debtInfo = debtKey
      ? (JSON.parse(debtKey) as CustomerDisplayDebtInfo)
      : undefined;

    if (phase === "thanks") {
      publishCustomerDisplay({
        type: "thanks",
        total: Number(total) || undefined,
        durationMs: 5000,
        paid: paidNum,
        change: changeNum,
        debt: debtInfo,
      });
      return;
    }

    if (phase === "payment") {
      publishCustomerDisplay({
        type: "payment",
        total: Number(total) || 0,
        currency: "сом",
        paid: paidNum,
        change: changeNum,
        debt: debtInfo,
      });
      return;
    }

    if (phase === "cart" && Array.isArray(cart) && cart.length > 0) {
      publishCustomerDisplay(
        buildCustomerDisplayCartMessage({ cart: cart as any, total, cartId }),
      );
      return;
    }

    publishCustomerDisplay({
      type: "idle",
      logoUrl: logoUrl || undefined,
      welcomeText,
      companyName: companyName || undefined,
      slides: getCustomerDisplaySlides(),
    });
  }, [
    phase,
    cart,
    total,
    cartId,
    paid,
    change,
    debtKey,
    logoUrl,
    welcomeText,
    companyName,
  ]);
}
 