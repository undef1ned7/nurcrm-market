/** id пользователя из payload access-JWT (claim user_id / sub) — если профиль его не отдаёт. */
const getUserIdFromAccessToken = (): unknown => {
  try {
    const token = localStorage.getItem("accessToken");
    const part = token?.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")));
    return payload?.user_id ?? payload?.sub ?? null;
  } catch {
    return null;
  }
};

export const resolveCashierId = ({ currentUser, userId, profile }: any = {}) => {
  const profileUser = profile?.user;
  const candidates = [
    currentUser?.id,
    userId,
    profile?.id,
    profile?.user_id,
    profileUser != null && typeof profileUser === "object"
      ? profileUser.id
      : profileUser,
  ];
  // Пустая строка (userId по умолчанию "") — не значение: пропускаем, а не `??`
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  const fromToken = getUserIdFromAccessToken();
  return fromToken != null && String(fromToken).trim()
    ? String(fromToken).trim()
    : "";
};

export const getShiftCashierId = (shift: any) => {
  const raw = shift?.cashier ?? shift?.cashier_id ?? shift?.user;
  if (raw != null && typeof raw === "object") {
    const nested = raw.id ?? raw.pk;
    return nested != null && String(nested).trim() ? String(nested) : "";
  }
  return raw != null && String(raw).trim() ? String(raw) : "";
};

export const isOwnOpenShift = (shift: any, cashierId: any) =>
  shift?.status === "open" &&
  Boolean(cashierId) &&
  getShiftCashierId(shift) === String(cashierId);

export const findOwnOpenShiftInList = (list: any, cashierId: any) =>
  (Array.isArray(list) ? list : []).find((s) => isOwnOpenShift(s, cashierId)) ||
  null;

/** Ищет открытую смену текущего кассира через GET /construction/shifts/?status=open */
export const fetchOwnOpenShift = async (apiClient: any, cashierId: any) => {
  if (!cashierId) return null;

  const searchPages = async (params: any) => {
    let page = 1;
    let hasNext = true;

    while (hasNext && page <= 10) {
      const { data } = await apiClient.get("/construction/shifts/", {
        params: { ...params, page },
      });
      const found = findOwnOpenShiftInList(data?.results, cashierId);
      if (found) return found;
      hasNext = !!data?.next;
      page += 1;
    }

    return null;
  };

  try {
    const fromOpenFilter = await searchPages({ status: "open" });
    if (fromOpenFilter) return fromOpenFilter;
  } catch {
    // фильтр status=open может быть недоступен — ищем по всем страницам
  }

  try {
    return await searchPages({});
  } catch {
    return null;
  }
};
