import { useCallback, useEffect, useState } from "react";
import api from "@shared/api";
import { useUser } from "@entities/user";
import { resolveCashierId, fetchOwnOpenShift } from "@shared/lib/tools/cashierOpenShift";

/**
 * Открытая смена текущего пользователя, доступная вне кассирской страницы
 * (склад, долги — там сегодня нет доступа к сменам вообще). Не пишет в
 * `shiftSlice.currentShift` — тот уже занят кассирским флоу открытия/закрытия
 * смены и админским просмотром смены по id в `ShiftDetail.tsx`.
 */
export function useOwnOpenShift() {
  const { profile } = useUser();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const cashierId = resolveCashierId({ profile });
    if (!cashierId) {
      setShift(null);
      return null;
    }
    setLoading(true);
    try {
      const found = await fetchOwnOpenShift(api, cashierId);
      setShift(found);
      return found;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { shift, shiftId: shift?.id ?? null, loading, refresh };
}
