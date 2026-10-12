# Исправление: возврат должен передавать `shiftId`

**Баг:** [sale-flow-bugs.md, пункт 5](../sale-flow-bugs.md#5--возврат-не-передаёт-shiftid)
**Нужен бэк:** нет — бэк уже принимает это поле, фронт просто его не шлёт
**Приоритет:** 🟠 высокий — компенсирующее движение по кассе не привязывается к смене кассира

---

## 1. Проблема

Thunk `returnSale` (`src/entities/sale/model/saleThunk.ts:280-317`) уже умеет принимать `shiftId` и передавать маршрутизацию кассы:

```js
export const returnSale = createAsyncThunk(
  "products/returnSale",
  async ({ saleId, items, is_defect, shiftId, idempotencyKey }, { rejectWithValue, getState }) => {
    ...
    const routing = isAgent
      ? null
      : buildPosRoutingFromUser(state?.user?.profile, state?.user?.company, shiftId);
    const payload = buildSaleReturnPayload({ items, is_defect, isAgent, idempotencyKey, routing });
    const { data } = await api.post(endpoint, payload);
    ...
  },
);
```

Но единственный вызывающий компонент — `src/pages/sell/ui/RefundPurchase.tsx:275` — не передаёт `shiftId` вообще:

```js
const payload = {
  saleId: currentItem.id,
  idempotencyKey: idempotencyRef.current.key,
};
if (itemsForReturn?.length) payload.items = itemsForReturn;
const returnedSale = await dispatch(returnSale(payload)).unwrap();
```

Из-за этого `buildPosRoutingFromUser(..., shiftId)` вызывается с `shiftId = undefined`, и в теле запроса просто не будет поля `shift_id` — маршрутизация компенсирующего движения по кассе уходит без привязки к конкретной смене кассира, который оформил возврат.

## 2. Откуда взять `shiftId`

`RefundPurchase.tsx` рендерится из `src/pages/sell/ui/components/sell/SellModals.tsx` — нужно посмотреть, откуда туда приходит `vm` (view-model страницы `/crm/sell`), и есть ли там уже открытая смена кассира в стейте.

Реалистичные источники (в порядке предпочтения):

1. **Если у пользователя есть открытая смена** — она должна уже быть доступна через `useShifts()`/аналогичный селектор в `useSellPage.ts` (там же, где строится остальной `vm` для `Sell.tsx`). Найти открытую смену текущего кассира тем же способом, что в кассе: `findOwnOpenShiftInList(shifts, cashierId)` из `src/shared/lib/tools/cashierOpenShift.ts` — эта утилита уже переиспользуема, не специфична для `useCashierShifts.ts`.
2. **Если возврат оформляется на `/crm/sell` не обязательно в контексте открытой смены** (например, менеджер оформляет возврат по старому чеку, у него самого смена может быть не открыта) — тогда логично брать `shift` из **исходной продажи**, которую возвращают: `currentItem.shift` (это поле уже есть в ответе `/main/pos/sales/{id}/`, см. пример в `sale-flow-bugs.md` пункт 11 — там `"shift": "274a245d-..."`). Возврат логично относить к той же смене, где была сделана продажа, если оформляющий не находится в своей открытой смене.

**Рекомендация:** передавать `shiftId` открытой смены **текущего кассира**, если она есть (это соответствует остальной логике кассы — компенсирующее движение должно попасть в ящик текущей активной смены, а не смены, где была совершена исходная продажа, если это разные смены/дни). Если открытой смены нет — не передавать `shiftId` вообще (как сейчас), и явно задокументировать это в коде комментарием, чтобы не было неясности.

## 3. Правка кода

```js
// RefundPurchase.tsx
import { useShifts } from "@entities/shift";
import { useUser } from "@entities/user";
import { findOwnOpenShiftInList, resolveCashierId } from "@shared/lib/tools/cashierOpenShift";

// внутри компонента:
const { shifts } = useShifts();
const { currentUser, profile, userId } = useUser(); // или соответствующий селектор, свериться с реальным шейпом useUser()
const cashierId = resolveCashierId({ currentUser, userId, profile });
const openShift = useMemo(
  () => findOwnOpenShiftInList(shifts, cashierId),
  [shifts, cashierId],
);

// в performReturn:
const payload = {
  saleId: currentItem.id,
  idempotencyKey: idempotencyRef.current.key,
  shiftId: openShift?.id, // ← добавить
};
```

Проверить точный шейп `useShifts()`/`useUser()` перед правкой — в разных местах кассы используются немного разные селекторы (`useSelector((s) => s.shifts.shifts)` напрямую в некоторых хуках), важно не тянуть лишний повторный fetch, если данные уже есть в сторе на момент открытия `/crm/sell`.

## 4. Тест

- Юнит-тест на `RefundPurchase`: замокать `useShifts`/`useUser` с открытой сменой, вызвать возврат, проверить что `dispatch(returnSale(...))` получил `shiftId`, равный `openShift.id`.
- Кейс без открытой смены: `shiftId` не передаётся (`undefined`), поведение не ломается (как сейчас).

## 5. Бэк

Не требуется — маршрутизация по `shift_id` в `/return/` уже реализована и задокументирована (см. `docs/backend/kassa/sale-return-cashflow-backend.md`). Это чисто фронтовая недоделка: поле не отправлялось, хотя бэк его ждёт.
