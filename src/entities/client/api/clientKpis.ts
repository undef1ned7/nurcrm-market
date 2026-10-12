import api from "@shared/api";
import {
  EMPTY_CLIENT_KPIS,
  mapClientKpis,
  type ClientKpis,
} from "../lib/clientKpis";

export const CLIENT_KPIS_URL = (clientId: string | number) =>
  `/main/clients/${clientId}/kpis/`;

export async function fetchClientKpis(
  clientId: string | number,
): Promise<ClientKpis> {
  const { data } = await api.get(CLIENT_KPIS_URL(clientId));
  return mapClientKpis(data) ?? EMPTY_CLIENT_KPIS;
}
