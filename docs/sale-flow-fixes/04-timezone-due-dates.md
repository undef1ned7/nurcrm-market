# Исправление: дата долга не должна съезжать на день (таймзона)

**Баг:** [sale-flow-bugs.md, пункт 4](../sale-flow-bugs.md#4--дата-долга-съезжает-на-день-из-за-таймзоны-utc6)
**Нужен бэк:** нет
**Приоритет:** 🟠 высокий — влияет на реальные даты погашения долга, отправляемые в `POST /deals/` и `POST /main/debts/`

---

## 1. Проблема

`src/pages/cashier/ui/paymentPage.utils.ts:35-44`:

```js
export function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function addCalendarDaysToIso(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);          // локальная полночь
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().split("T")[0];   // конвертация в UTC!
}
```

`setHours(0,0,0,0)` выставляет **локальную** полночь. `.toISOString()` переводит момент времени в UTC. Для Бишкека (UTC+6) локальная полночь — это 18:00 предыдущего дня по UTC, поэтому `.toISOString().split("T")[0]` возвращает дату на день раньше нужной **всегда**, не только в отдельные часы.

`getTodayIsoDate()` — та же ошибка на текущей дате: с полуночи до 6 утра по местному времени (UTC+6) она даже без прибавления дней вернёт «вчера».

## 2. Где используется

- `getTodayIsoDate()` → `min` для календаря первой даты платежа, `src/pages/cashier/ui/components/PaymentPageDebtSection.tsx:245`.
- `addCalendarDaysToIso(daysAdd)` → фолбэк даты погашения для v1-долга, когда `deferredDueDate` пуст, `src/pages/cashier/ui/hooks/usePaymentPage.ts:769` — уходит в `POST /clients/{id}/deals/` (`first_due_date`) и `POST /main/debts/` (`due_date`, тариф «Старт»).

## 3. Исправление

В этом же репозитории уже есть правильная реализация — `src/entities/sale/lib/buildDebtSchedule.ts:47-58`:

```js
export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatIsoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function todayIsoDate() {
  const now = new Date();
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDaysToIso(iso, days) {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  date.setDate(date.getDate() + Number(days || 0));
  return formatIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
```

Никакого `toISOString()` — везде локальные `getFullYear`/`getMonth`/`getDate`, поэтому конвертации в UTC не происходит и число не съезжает.

**План:**
1. В `src/pages/cashier/ui/paymentPage.utils.ts` убрать локальные `getTodayIsoDate`/`addCalendarDaysToIso`, заменить на импорт `todayIsoDate`/`addDaysToIso` из `@entities/sale` (`buildDebtSchedule.ts` уже экспортируется оттуда — проверить `src/entities/sale/index.ts`, там уже есть `export * from "./lib/buildDebtSchedule"`).
2. В местах использования (`PaymentPageDebtSection.tsx:245`, `usePaymentPage.ts:769`) заменить импорт на новые функции без изменения сигнатур вызова — `addCalendarDaysToIso(daysAdd)` → `addDaysToIso(todayIsoDate(), daysAdd)` (сигнатура `addDaysToIso` принимает базовую дату явным аргументом, а не «от сегодня», так что вызов чуть изменится, но семантика та же).
3. Прогнать существующие тесты `buildDebtSchedule.test.ts` — они уже покрывают `todayIsoDate`/`addDaysToIso`, ничего дополнительно писать не обязательно, но стоит добавить тест конкретно на регрессию таймзоны (см. ниже).

## 4. Дубли той же ошибки в других местах — почистить заодно

Тот же паттерн (`new Date(); setHours(0,0,0,0); ...toISOString().split("T")[0]`) продублирован ещё в нескольких файлах вне кассы — раз чиним первоисточник, имеет смысл поправить и их, чтобы не осталось разных реализаций «сегодня» с разным поведением:

- `src/features/warehouse-ops/ui/AddProduct/AddProductModal.tsx:29`
- `src/shared/lib/tools/deferredPaymentDates.ts:1`
- `src/pages/warehouse/ui/supplierReceipt/supplierReceiptUtils.ts:68`

Предложение: вынести `todayIsoDate`/`addDaysToIso`/`formatIsoDate` в `src/shared/lib/tools/isoDate.ts` как общую утилиту (реэкспортировать из `buildDebtSchedule.ts` для обратной совместимости, чтобы не трогать все импорты сразу), и постепенно перевести все 4 копии на неё.

## 5. Тест на регрессию таймзоны

Дата в тестовой среде обычно UTC или локальная TZ раннера — тест должен явно подставлять таймзону, иначе не поймает регрессию на CI:

```js
// buildDebtSchedule.test.ts (дополнить)
it("не должен зависеть от UTC-конвертации (регрессия таймзоны)", () => {
  // Подделываем "полночь по Бишкеку" — важно тестировать именно вокруг
  // полуночи, где старая реализация путала день.
  const originalTZ = process.env.TZ;
  process.env.TZ = "Asia/Bishkek";
  try {
    vi.setSystemTime(new Date("2026-09-30T00:30:00+06:00")); // 00:30 по Бишкеку
    expect(todayIsoDate()).toBe("2026-09-30"); // не "2026-09-29"
  } finally {
    process.env.TZ = originalTZ;
    vi.useRealTimers();
  }
});
```

## 6. Бэк

Не требуется — это чисто клиентский расчёт даты для UI/payload. Бэк получает уже готовую строку `YYYY-MM-DD` и её же использует буквально (см. `debt-installment-schedule-backend.md`), проблема целиком на стороне генерации этой строки во фронте.
