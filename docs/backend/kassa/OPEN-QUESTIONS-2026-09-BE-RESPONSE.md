# Ответы бэкенда на открытые вопросы (сентябрь 2026)

**Дата ответа BE:** 2026-09-08
**От:** Бэкенд NurCRM API → `nur-market` (FE / docs) / Flutter
**Staging:** тесты 28/28 OK · **Выкат Staging → Prod:** 2026-09-10, окно 04:00–06:00 UTC+6
**Вопросы:** [OPEN-QUESTIONS-2026-09.md](./OPEN-QUESTIONS-2026-09.md)

---

## Разбор FE: что закрыто, что требует действий

### ✅ Закрыто, действий на FE не нужно

| Блок | Пункт | Итог |
|---|---|---|
| 1 | R3 `affects_shift_drawer` (cash `True` / безнал `False` / split пропорционально) | Совпадает с §9–10. FE только читает поле. |
| 1 | R7 привязка смены (открыта → в неё; закрыта → текущая открытая; нет смены → `shift=null`) | Все 3 ситуации подтверждены. |
| 1 | R8 `is_defect=true` — деньги возвращаются, `expense` создаётся, товар не на склад | Совпадает. |
| 1 | R11 атомарность (`test_sale_return_atomic_rollback`) | Ок. |
| 1 | R2 идемпотентность: `UNIQUE(company, idempotency_key)`, повтор → 200 + сохранённое тело | Совпадает с `saleReturn.ts` (`idempotencyRef`). |
| 1 | R5 статус чека на проводе = **`"partially_returned"`** (полный → `"canceled"`) | `normalizeSaleStatus` уже понимает это значение — правок нет. |
| 1 | R9 WS `market.cashflow.created`: поля `cashflow_id`, `cashbox_id`, `source_kind` | `cashflowRealtimeEvent.ts` читает по этим именам (алиасы) — приёмник готов. |
| 2 | WS-поля `cashbox_id` / `cashflow_id` / `shift_id` / `request_kind` / `status` (snake_case) | Совпадает с парсером `cashflowRealtimeEvent.ts` / `cashSlice.ts`. |
| 2 | `GET /construction/cashflows/?status=pending&cashbox=` — состав (`request_kind`, `target_flow{}`, `proposed`, `reason`, `requested_by`) | Совпадает с `entities/cash`. |
| 2 | Закрытая смена → `422` + `detail` | `validateResErrors` читает `detail` — текст всплывёт как есть. |
| 2 | Bulk-approve смешанного списка (обычные + edit + cancel), атомарно | Тест №12 — ок. |
| 3 | Вариант **A**: `delete_item_code` = `Company.cashier_password` | FE fallback уже завязан на `company.cashier_password`. |
| 3 | Пути `/main/pos/cashier-settings/`, `.../verify-delete-code/` | Совпадают с `MARKET_CASHIER_SETTINGS_URL`. |
| 3 | `verify-delete-code/` всегда 200 `{valid}`, троттлинг `429`, окно 120 сек | FE-поток «verify → DELETE» работает без изменений. |
| 3 | Утечка `cashier_password` в `GET /users/company/` закрыта (только `owner`) | ⚠️ было «owner/admin» — теперь и admin не видит код; FE это переживёт (берёт из cashier-settings). |
| 3 | `debt_schedule_version`: нет значения → `"v1"` | Совпадает. |
| 4 | Бэкфилл — решение **(c)**: закрытые смены не трогаем (< 10 чеков на проде) | Текст для клиента приложен BE. |
| 5 | `non_drawer_expenses_total` в `GET /shifts/{id}/` и в `close/` | Появилось поле с API. |
| 5 | Все кассы получили `role` (миграция `0023`); «Старт» → `approved`; `open_shift_expected_cash` = `drawer_expected_cash` | Ок. |

### Действия FE — статус

Чек-лист выката: [RELEASE-2026-09-10.md](./RELEASE-2026-09-10.md).

| # | Что | Статус |
|---|---|---|
| A1 | **Синхронный выкат 2026-09-10 04:00–06:00 UTC+6:** `VITE_BE_CASHFLOWS=true` в prod+staging в окно BE `AUTO_CASHFLOWS=true`. | ⏳ в окне релиза (`.env.example` + чек-лист готовы) |
| A2 | `VITE_CASHFLOW_CHANGE_REQUESTS=true`: staging — сейчас; prod — после выката BE 2026-09-10. | ⏳ в окне релиза (`.env.example` обновлён) |
| A3 | **R4 — компенсирующий `expense` создаётся `pending`** на тарифах с модерацией → приход по возвращённому чеку держится в `approved`-отчёте кассы и аналитике «Финансы», пока владелец не одобрит минус в «Запросах». | ⚠️ на согласование с продактом (не код) |
| A4 | Приёмник `market.shift.updated` (`shift_id`, `drawer_expected_cash`, `cash_sales_total`) для live-обновления открытой смены. | ✅ `shiftRealtimeEvent.ts` + `shiftRealtimeUpdateReceived` в `shiftSlice` + wire в `useNotificationsSocket.tsx` (+тесты) |
| A5 | `CloseShiftPage` берёт `non_drawer_expenses_total` из ответа смены; `estimateShiftWarehouseDrain` — только fallback. | ✅ `CloseShiftPage.tsx` |
| A6 | Рендер «было → станет» при частичном `proposed` (без `type`). | ✅ уже ок — `Pending.tsx` читает `proposed.* ?? target.*` |
| A7 | Обработка `400 {detail, max_discount_percent}` при превышении лимита скидки. | ✅ `useCashierProducts.debouncedDiscount` разворачивает ответ и показывает `detail`; ⚠️ путь `start` / `PATCH .../order-discount/` сверить с BE |
| A8 | `X-Delete-Code` вместо предварительного `verify-delete-code/`. | ⏭️ опционально — текущий поток рабочий |

### ℹ️ Остаточные gaps (принято, работать не требуется)

- Per-line `returned_qty` / `returnable_qty` в `GET /main/pos/sales/{id}/` BE **не подтвердил** (история в `SaleReturn.items_payload`). `RefundPurchase` продолжает опираться на `400` при перевозврате — как и договаривались в §17.
- Phase 2 (выдача из ящика, transfer между кассами отдельной операцией, блокировка закрытия смены при большом минусе) — **бэклог BE**.

---

## Полный текст ответа BE

> Ниже — как прислал бэкенд, без изменений.

### Сводка по блокам

| Блок | Тема | Статус | Выкат Staging → Prod |
|---|---|---|---|
| Блок 1 | Возврат чека (POS) → компенсирующий expense | Готово на Staging (10/10) | 2026-09-10 04:00 UTC+6 |
| Блок 2 | Заявки на редактирование / отмену кассовых движений | Готово на Staging (`0025`, 13/13) | 2026-09-10 04:00 UTC+6 |
| Блок 3 | Настройки кассы (код удаления + макс. скидка) | Готово на Staging (эндпоинты + 5/5) | 2026-09-10 04:00 UTC+6 |
| Блок 4 | Бэкфилл исторических смен | Решение (c): не трогаем закрытые | Зафиксировано |
| Блок 5 | Phase 2 — продуктовые пробелы | Частично готово / Бэклог | См. ниже |
| Блок 6 | Синхронный выкат | Согласовано окно релиза | 2026-09-10 04:00–06:00 UTC+6 |

### Блок 1. Возврат чека → компенсирующее движение

**1.1 (R3, R4, R7, R8, R11)**

- **R3** — `affects_shift_drawer`: наличная часть → `True` (при открытой смене), безнал (`card`/`mbank`/`optima`/…) → `False`. Для `split` возврат разбивается по каждому `SalePayment` пропорционально сумме возврата: наличная часть `True`, безналичные `False`.
- **R4** — статус компенсирующего `expense`: тариф «Старт» → `approved` сразу; тарифы с модерацией → `pending` (зеркально исходному чеку). При `reject` исходной продажи в Pending каскадный реджект компенсирующего возврата запрещён → `409 Conflict` (`test_reject_pos_sale_return_raises_conflict`).
- **R7** — привязка смены: (1) исходная смена открыта → `shift = sale.shift`; (2) закрыта → текущая открытая смена кассира, без мутации закрытой; (3) нет открытой смены → `shift = null`, `affects_shift_drawer = False`, возврат не блокируется.
- **R8** — `is_defect=true`: деньги клиенту возвращаются, компенсирующий `expense` создаётся, товар на склад не возвращается.
- **R11** — весь возврат в `@transaction.atomic`; ошибка INSERT движения откатывает склад/чек/долг (`test_sale_return_atomic_rollback`).

**1.2 (R2)** — `UniqueConstraint(fields=["company", "idempotency_key"])` на `SaleReturn`. Повтор с тем же ключом → `200` + сохранённое `response_data`, без дублей расхода и повторного возврата остатков. Разные ключи → независимые накопительные частичные возвраты.

**1.3 (R5)** — частичный возврат: статус `"partially_returned"`, полный — `"canceled"`. В `CashShift` чеки `"partially_returned"` учитываются по пересчитанному `total`; выданная наличность — в `expense` `source_kind="pos_sale_return"`, `affects_shift_drawer=True` → `drawer_expected_cash` и `cash_diff` сходятся. По позициям уменьшается `quantity`; история — `SaleReturn.items_payload`.

**1.4 (R9)** — WS-группа компании `notif_company_{company_id}`:
- `market.cashflow.created`: `cashflow_id`, `cashbox_id`, `type: "expense"`, `amount`, `source_kind: "pos_sale_return"`, `source_id`.
- `market.shift.updated` (если затронута открытая смена): `shift_id`, `drawer_expected_cash`, `cash_sales_total`.

**1.5 (R10)** — решение (3)+(2): закрытые периоды автоматически не меняются; для единичных компаний — ручная корректировка через `/crm/kassa`. На проде затронуто < 10 чеков.

**1.6 — примеры со Staging**

Частичный возврат `POST /main/pos/sales/{id}/return/` (200):
```json
{ "id": "791a767e-cc36-4f50-b5a2-f4f5cf92e026", "status": "partially_returned", "total": "300.00", "debt_adjustment": null }
```
Повтор с тем же `idempotency_key` (200):
```json
{ "id": "791a767e-cc36-4f50-b5a2-f4f5cf92e026", "status": "partially_returned", "total": "300.00" }
```
Запись `pos_sale_return` в `GET /construction/cashflows/{id}/`:
```json
{
  "id": "4685906f-9c10-43b5-a772-c7ffe8643948",
  "name": "Возврат по чеку №100500 (Наличные)",
  "type": "expense", "amount": "300.00", "status": "approved",
  "source_kind": "pos_sale_return", "source_id": "791a767e-cc36-4f50-b5a2-f4f5cf92e026",
  "affects_shift_drawer": true,
  "cashbox": "6ac50224-0985-482f-b83e-9d58ab8b43b9",
  "shift": "84abf50b-c063-4661-8f0e-a721490a1eea"
}
```
Смена до / после возврата 300.00 наличными `GET /construction/shifts/{id}/`:
```json
{ "id": "84abf50b-…", "opening_cash": "1000.00", "drawer_expected_cash": "1600.00", "cash_sales_total": "600.00" }
{ "id": "84abf50b-…", "opening_cash": "1000.00", "drawer_expected_cash": "1300.00", "cash_sales_total": "300.00" }
```

### Блок 2. Заявки на редактирование / отмену движения

1. WS-поля (snake_case): `cashbox_id`, `cashflow_id`, `shift_id` (или `null`), `request_kind` (`edit`|`cancel`), `status` (`pending`|`approved`|`rejected`).
2. Прод: 2026-09-10 04:00 UTC+6.
3. `GET /construction/cashflows/?status=pending&cashbox={id}` (Staging):
```json
{
  "id": "2aa50748-f66f-4d59-b71c-5a99c216f4dd",
  "cashbox": "15153575-4777-4712-94c5-cfeb143b4099",
  "cashbox_name": "Касса филиала",
  "type": "income", "name": "Продажа (корр)", "amount": "1400.00", "status": "pending",
  "request_kind": "edit",
  "target_flow": {
    "id": "461ae2a5-4cc8-4103-a93a-00f73224337f",
    "name": "Продажа", "amount": "1500.00", "type": "income",
    "created_at": "2026-09-08T19:03:42.543588+06:00"
  },
  "proposed": { "name": "Продажа (корр)", "amount": "1400.00" },
  "reason": "Неверная сумма",
  "requested_by": { "id": "055726b6-ac23-4798-8433-ce645da76c69", "name": "Test Owner" }
}
```
4. Закрытая смена (R6): `422`
```json
{ "detail": "Нельзя изменить/отменить движение закрытой смены." }
```
5. Bulk-approve: подтверждено тестом №12 — смешанный список обрабатывается атомарно.

### Блок 3. Настройки кассы

1. Вариант **A**: используется `Company.cashier_password`.
2. Эндпоинты:
   - `GET /main/pos/cashier-settings/` — всем сотрудникам; `delete_item_code` только `owner`/`admin`; остальным `delete_item_code_required`, `max_discount_percent`, `debt_schedule_version`.
   - `PATCH /main/pos/cashier-settings/` — только `owner`/`admin` (`403` иначе); валидация: 4–8 цифр, скидка 0–100%, версия `v1`/`v2`.
   - `POST /main/pos/cashier-settings/verify-delete-code/` — `secrets.compare_digest`, 10 попыток/мин (`429`), при совпадении — временное разрешение 120 сек в кэше; всегда `200` с `{ "valid": true|false }`.
3. В `CompanySerializer` (`GET /users/company/`) `cashier_password` исключён для всех ролей, кроме `owner`.
4. Проверки:
   - Код удаления — **оба** способа: заголовок `X-Delete-Code: <code>` при `DELETE /main/pos/carts/{cart_id}/items/{item_id}/` и `DELETE /main/pos/sales/{id}/`; либо предварительный `verify-delete-code/` (120 сек). Нет подтверждения → `403 {"detail": "Требуется код удаления или время проверки истекло"}`.
   - Лимит скидки: при превышении `max_discount_percent` в `PATCH /main/pos/carts/{cart_id}/items/{item_id}/`, `POST /main/pos/sales/start/`, `PATCH .../order-discount/` → `400 {"detail": "Максимальная скидка — 20.00%", "max_discount_percent": "20.00"}` (без молчаливой обрезки).
5. Аудит: логгер `crm.pos.cashier_settings` (user id, company id, `valid`, IP); код не логируется.
6. `debt_schedule_version`: нет значения → `"v1"`.

### Блок 4. Бэкфилл — решение (c)

Закрытая смена — юридически зафиксированный документ; пересчёт задним числом не делаем. Новые/текущие смены — по исправленной формуле (`drawer_expected_cash` vs `ledger_expected_cash`). Текст для клиента: *«В закрытых сменах до обновления отображался сквозной баланс с учётом всех типов операций. В текущей версии реализовано разделение наличных ящика кассы и безналичных/складских движений»*.

### Блок 5. Phase 2

1. Выдача из ящика под закупку — **бэклог (Phase 2)**.
2. Transfer между кассами — **бэклог (Phase 2)**; сейчас через операцию перемещения в `/crm/kassa`.
3. Блокировка закрытия смены при превышении порога — **бэклог**.
4. `non_drawer_expenses_total` — **есть** в `GET /construction/shifts/{id}/` и в ответе `close/`.
5. Все кассы получили `role` (миграция `0023`); `get_inferred_role()` оставлен как fallback.
6. «Старт» → авто-движения сразу `approved`.
7. `open_shift_expected_cash` синхронизировано с `drawer_expected_cash`.

### Блок 6. Синхронный выкат

- Окно: **2026-09-10 (чт), 04:00–06:00 UTC+6**.
- Включается разом для Staging и Prod; риск двойных записей закрыт `idempotency_key`.
- Мониторинг: алерты в Sentry по `cashbox_unresolvable`.
