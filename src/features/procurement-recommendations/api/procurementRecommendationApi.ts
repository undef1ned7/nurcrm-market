import api from "@shared/api";
import { RECOMMENDATIONS_API_PATH } from "../model/constants";
import type {
  ProcurementRecommendationPayload,
  ProcurementRecommendationSettings,
} from "../model/types";
import { fetchComposedRecommendations } from "./mockAdapter";
import { mapRecommendationResponse } from "./mapRecommendationResponse";

const isMissingEndpoint = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405;
};

export async function fetchProcurementRecommendations({
  supplierId,
  supplierName,
  settings,
  branchId,
  warehouseId,
}: {
  supplierId: string;
  supplierName: string;
  settings: ProcurementRecommendationSettings;
  branchId?: string;
  warehouseId?: string;
}): Promise<ProcurementRecommendationPayload> {
  const normalizedId = String(supplierId || "").trim();
  if (!normalizedId) {
    return {
      supplier: { id: "", name: supplierName },
      source: "backend",
      items: [],
    };
  }

  try {
    const res = await api.get(RECOMMENDATIONS_API_PATH(normalizedId), {
      params: {
        analysis_days: settings.analysisDays,
        coverage_days: settings.coverageDays,
        safety_days: settings.safetyDays,
        ...(branchId ? { branch_id: branchId } : {}),
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
        page_size: 500,
      },
    });
    return mapRecommendationResponse(res.data, {
      id: normalizedId,
      name: supplierName,
    });
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error;
    return fetchComposedRecommendations(normalizedId, supplierName);
  }
}
