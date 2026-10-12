import { useMemo } from "react";
import { useUser } from "../model/userSlice";
import {
  getMarketSphereFeatures,
  normalizeMarketSphere,
  type MarketSphere,
  type MarketSphereFeatures,
} from "./marketSphere";

/**
 * Текущий вид магазина из `company.market_sphere` (Redux). После PATCH
 * компания в сторе обновляется сразу — экраны перестраиваются без перезагрузки.
 */
export function useMarketSphere(): {
  sphere: MarketSphere;
  features: MarketSphereFeatures;
} {
  const { company } = useUser() as any;
  const sphere = normalizeMarketSphere(company?.market_sphere);
  return useMemo(
    () => ({ sphere, features: getMarketSphereFeatures(sphere) }),
    [sphere],
  );
}
