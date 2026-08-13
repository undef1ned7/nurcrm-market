import { useEffect, useMemo } from "react";
import { useUser } from "@entities/user";
import { buildCustomerDisplayCartMessage } from "../lib/buildCartMessage";
import { publishCustomerDisplay } from "../lib/channel";
import {
  getCustomerDisplaySlides,
  getCustomerDisplayWelcome,
  isCustomerDisplayEnabled,
} from "./settings";
import type { CustomerDisplayPhase } from "./types";

export function useCustomerDisplayPublisher({
  phase,
  cart,
  total,
  cartId,
}: {
  phase: CustomerDisplayPhase | "skip";
  cart?: unknown[] | null;
  total?: number;
  cartId?: string | number | null;
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

  useEffect(() => {
    if (phase === "skip" || !isCustomerDisplayEnabled()) return;

    if (phase === "thanks") {
      publishCustomerDisplay({
        type: "thanks",
        total: Number(total) || undefined,
        durationMs: 5000,
      });
      return;
    }

    if (phase === "payment") {
      publishCustomerDisplay({
        type: "payment",
        total: Number(total) || 0,
        currency: "сом",
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
  }, [phase, cart, total, cartId, logoUrl, welcomeText, companyName]);
}
