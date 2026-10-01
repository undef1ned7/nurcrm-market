# Баг BE: v2-долг помесячно падает с «нельзя указывать debt_days и debt_months одновременно»

**Дата:** 2026-09-29
**Статус:** 🔴 баг на проде (`app.nurcrm.kg`), блокирует оформление долга «по месяцам» на v2
**Экран:** `/crm/market/cashier` → оплата → «Отсрочка» → график по месяцам
**Связано:** [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md) (контракт полей), [debt-v2-backend-implementation.md](./debt-v2-backend-implementation.md) (ранее задокументированный баг v1-fallback на stage)

---

## 1. Репро

```http
POST /api/main/clients/d5019aaa-aac6-4585-8644-a14371f2b323/deals/
```

```json
{
  "title": "Долг ТЕСТ API Долг",
  "kind": "debt",
  "amount": "158.30",
  "note": "",
  "client": "8277e6f1-cc22-46bb-999f-6852af79875b",
  "debt_months": 3,
  "first_due_date": "2026-10-29",
  "interval_months": 1,
  "installments": [
    { "number": 1, "amount": "52.76", "due_date": "2026-10-29" },
    { "number": 2, "amount": "52.76", "due_date": "2026-11-29" },
    { "number": 3, "amount": "52.78", "due_date": "2026-12-29" }
  ],
  "schedule_version": "v2",
  "auto_schedule": true
}
```

**Ответ:** `400 Bad Request`

```json
{ "debt_months": ["Нельзя одновременно указывать debt_days и debt_months."] }
```

**В payload нет поля `debt_days` вообще** — фронт его не отправляет (см. `createDeal` в [saleThunk.ts](../../../src/entities/sale/model/saleThunk.ts), ветка `hasMonths`: если задан `debt_months`, `debt_days` в тело не попадает). Payload полностью соответствует спеке из [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md#по-месяцам).

**Тот же клиент/сумма, но по дням (`debt_days` + `interval_days`, без `debt_months`) — проходит без ошибки.** Ошибка воспроизводится только на ветке «месяцы».

---

## 2. Гипотеза причины

Раз в запросе `debt_days` физически отсутствует, а валидатор всё равно видит его «заполненным» — значение берётся не из тела запроса, а из **дефолта поля модели/сериализатора** (похоже, `debt_days` имеет `default=30`, это уже видно из другого бага: в [debt-v2-backend-implementation.md §2.3](./debt-v2-backend-implementation.md#23-фактический-ответ--v1-fallback) для запроса вообще без `debt_days`/`debt_months` бэк в ответе вернул `"debt_days": 30`).

Похоже, при сборке `Deal(**cleaned_data)` (или аналогичного вызова) ключ `debt_days` отсутствует в `cleaned_data`, и Django/DRF подставляет дефолт поля модели ещё до XOR-проверки:

```python
has_days = deal.debt_days is not None      # True — сработал default=30, а не «клиент прислал»
has_months = deal.debt_months is not None  # True — клиент прислал 3
if has_days and has_months:
    raise ValidationError(...)             # ложное срабатывание
```

Проверка должна смотреть **было ли поле в теле запроса**, а не на итоговое значение после применения дефолта модели, например:

```python
has_days = "debt_days" in request.data and request.data.get("debt_days") is not None
has_months = "debt_months" in request.data and request.data.get("debt_months") is not None
```

либо явно `debt_days = serializers.IntegerField(required=False, default=None)` вместо дефолта модели, чтобы отсутствующее поле не подменялось числом.

---

## 3. Почему это не фронтовый баг

- Payload byte-в-byte соответствует документированному контракту v2 (см. пример «По месяцам» в [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md)).
- `debt_days` не сериализуется в тело, когда указан `debt_months` — см. `createDeal` thunk, ветка `if (hasDays) {...} else if (hasMonths) {...}` (взаимоисключающе).
- Симметричный запрос «по дням» с тем же кодом успешен — значит, генерация payload на фронте корректна, ветвление ломается только на бэке для месяцев.

## 4. Что нужно от BE

1. Починить XOR-проверку `debt_days`/`debt_months`, чтобы она смотрела на **наличие поля в запросе**, а не на значение после применения дефолта.
2. Убедиться, что дефолт `debt_days=30` (или какой он есть) не «просачивается» в это сравнение ни при каком сочетании полей.
3. Прогнать оба сценария из [debt-installment-schedule-backend.md — Критерии приёмки BE](./debt-installment-schedule-backend.md#критерии-приёмки-be):
   - `debt_months: 4` → 4 ежемесячных платежа, без 400;
   - `debt_days: 10` + `interval_days: 2` → по-прежнему без 400 (регрессия).

## 5. Временная рекомендация кассирам

До фикса на бэке долг **«по месяцам»** на v2-графике оформить нельзя (400 на каждом чеке). Работает вариант **«по дням»** — использовать его как обход, пока это не закрыто.

Фронт сознательно не подменяет `debt_months` на `debt_days` автоматически: `installments[]` для месяцев содержит реальные календарные даты (29-е число, не через 30 дней), и подмена смысла поля рискует записать в BE неверные метаданные графика (`debt_days`/`interval_days`) при отображении в карточке долга/аналитике, даже если сам массив `installments` придёт правильный.
