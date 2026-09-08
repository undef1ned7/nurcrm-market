# Сценарий после изменений: касса, смены, auto-cashflows

**Аудитория:** бэкенд, QA, владелец продукта  
**Фронт:** реализовано (маршрутизация `cashbox_role`, без `cashBoxes[0]`)  
**Бэкенд:** **ТЗ к реализации** — целевое состояние после выката BE + `VITE_BE_CASHFLOWS=true`

См. также: [auto-cashflows-backend.md](./auto-cashflows-backend.md), [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md).

---

## 1. Целевая архитектура (одной строкой)

**Бэк** в одной транзакции выполняет бизнес-операцию + cashflow и **сам** выбирает кассу по `branch_id`, `cashbox_role`, `shift_id`. **Фронт** не подставляет `cashBoxes[0]` и не POST-ит `/construction/cashflows/` после авто-операций.

---

## 2. Полный сценарий по ролям

### 2.1. Настройка компании (один раз)

| Шаг | Кто | Действие |
|-----|-----|----------|
| 1 | Админ | Создаёт кассы с `role`: `pos_main`, `pos_branch` (+ `branch_id`), `expense_variable`, `expense_fixed` |
| 2 | Админ | Привязывает филиалы к `pos_branch` кассам |
| 3 | DevOps | На staging/prod: `AUTO_CASHFLOWS=true` (BE), `VITE_BE_CASHFLOWS=true` (FE) — **синхронно** |

**Пример (5 касс):**

| name | role | branch_id |
|------|------|-----------|
| Касса филиала №1 | pos_branch | филиал 1 |
| Основная касса компании | pos_main | — |
| Переменные расходы | expense_variable | — |
| Постоянные расходы | expense_fixed | — |

---

### 2.2. Открытие смены (кассир)

```
Кассир → «Открыть смену» → вводит размен (opening_cash)
```

**FE → BE:**

```http
POST /construction/shifts/open/
{
  "cashier": "<user_id>",
  "opening_cash": "5000.00",
  "branch_id": "<active_branch>",
  "cashbox_role": "pos_branch" | "pos_main"
}
```

**BE:**

1. `resolve_cashbox(branch_id, cashbox_role)` → POS-касса (не expense, не `results[0]`).
2. Создаёт shift с `cashbox = resolved_id`, `status = open`.
3. **Не** создаёт cashflow на размен (размен — поле смены).

**Ответ:** `shift.id`, `cashbox`, `cashbox_name`, `resolved_cashbox_id`.

---

### 2.3. Продажа на кассе (checkout)

```
Скан товаров → Оплата → (чек) → Успех
```

**FE → BE:**

```http
POST /main/pos/sales/{id}/checkout/
{
  "payment_method": "cash" | "transfer" | ...,
  "payments": [...],           // split
  "cash_received": "...",
  "branch_id": "...",
  "cashbox_role": "pos_branch",
  "shift_id": "<open_shift_id>",
  "print_receipt": true
}
```

**BE (одна транзакция):**

1. Проверка: open shift существует (или политика компании → `shift_required`).
2. Checkout → продажа `paid`.
3. `resolve_cashbox`: приоритет **shift.cashbox** → pos_branch → pos_main.
4. Создаёт cashflow(s):
   - cash / card → `source_kind=pos_sale`, `type=income`.
   - split → 1–2 записи `pos_sale`.
   - pure debt → `cashflows: []`.
   - debt + prepayment → `pos_prepayment` на сумму предоплаты.
5. `status`: `approved` (тариф «Старт») или `pending`.

**FE:** при `VITE_BE_CASHFLOWS=true` **не** вызывает `postCashflowIfNeeded`.

**Ответ:** sale + `cashflows[]` + `resolved_cashbox_id`.

---

### 2.4. Погашение долга (кассир / клиенты)

**Клиент (income, POS-касса):**

```http
POST /main/clients/{clientId}/deals/{dealId}/pay/
{
  "idempotency_key": "...",
  "installment_id": "...",
  "amount": "500.00",
  "branch_id": "...",
  "cashbox_role": "pos_branch",
  "shift_id": "..."
}
```

**BE:** 1× `debt_repayment` income на POS-кассу смены.

**Поставщик (expense, переменные расходы):**

```json
{ "cashbox_role": "expense_variable", ... }
```

**BE:** 1× `supplier_debt_payment` expense на «Переменные расходы» — **не** влияет на `expected_cash` смены.

---

### 2.5. Закупка / приход со склада

```
Склад → Add Product / Приход поставщика → оплата cash
```

**FE → BE (create product / receipt):**

```json
{
  "payment_mode": "cash",
  "cashbox_role": "expense_variable",
  ...
}
```

**BE:**

1. Создаёт товар / receipt.
2. Expense `warehouse_purchase` или `procurement_receipt` на кассу **expense_variable**.
3. `shift_id = null`, `affects_shift_drawer = false`.

**Критично:** эта сумма **не** участвует в формуле закрытия смены.

---

### 2.6. Возврат поставщику (cash)

```http
POST /main/suppliers/{id}/returns/
{
  "compensation": "cash",
  "cashbox_role": "expense_variable",
  "items": [...]
}
```

**BE:** income `supplier_return` на expense_variable (возврат денег от поставщика в «переменные расходы»).

---

### 2.7. Закрытие смены

```
Кассир → «Закрыть смену» → пересчитывает наличные в ящике → вводит closing_cash
```

**FE показывает:**

| Строка | Формула |
|--------|---------|
| Размен | `opening_cash` |
| Наличные продажи | `cash_sales_total` |
| **Ожидаемо по продажам** | `opening + cash_sales` (= `drawer_expected_cash`) |
| Закупки в смене (если legacy) | предупреждение, если BE ещё смешивает учёт |
| **Ожидаемо для сверки** | `drawer_expected_cash` (с бэка после фикса) |
| Расхождение | `closing_cash − drawer_expected_cash` |

**FE → BE:**

```http
POST /construction/shifts/{id}/close/
{ "closing_cash": "8888.00" }
```

**BE:** фиксирует `closing_cash`, `cash_diff`, `payment_breakdown`, **не** пересчитывает старые закупки в expected.

**Пример после фикса (кейс 33 768 / 54 625):**

| | Было (ошибка) | Стало |
|---|---------------|-------|
| expected | −20 806 | **33 818** |
| факт | 8 888 | 8 888 |
| расхождение | +29 694 (артеfact) | **−24 930** (реальное) |

---

### 2.8. Pending / reject

```
Бухгалтер → /crm/pending → reject cashflow
```

**BE (reject cascade):**

| source_kind | Действие |
|---------------|----------|
| pos_sale | отмена продажи |
| debt_repayment | откат платежа |
| warehouse_purchase | откат товара |
| … | см. auto-cashflows-backend.md |

**FE:** при `VITE_BE_CASHFLOWS=true` **не** вызывает локальные `deleteSale` / `deleteProduct`.

---

### 2.9. Ручная касса (/crm/kassa)

**Без изменений:** пользователь явно выбирает кассу → `POST /construction/cashflows/`.

---

## 3. Два режима (переходный период)

| | Legacy (сейчас по умолчанию) | Целевой |
|---|------------------------------|---------|
| `VITE_BE_CASHFLOWS` | false / unset | true |
| Auto cashflow | FE `postCashflowIfNeeded` | BE внутри API |
| Выбор кассы на FE | **нет** auto `cashBoxes[0]` | **нет** cashbox_id |
| Без явной кассы | legacy POST **пропускается** | BE создаёт сам |
| Pending reject | FE side-effects | только BE cascade |

**Промежуточная ловушка:** BE не готов + FE без cashbox → **деньги в учёте не появятся** (postCashflow no-op). Нужен синхронный выкат.

---

## 4. Риски

### 4.1. Критические

| # | Риск | Последствие | Митигация |
|---|------|-------------|-----------|
| R1 | BE не выкатили, FE без cashbox | Продажи/закупки без записей в кассе | Синхронный выкат; мониторинг `cashflows: []` при amount>0 |
| R2 | Double-write (BE+FE) | Дубли income/expense | Одновременно `AUTO_CASHFLOWS` + `VITE_BE_CASHFLOWS` |
| R3 | Закупки на POS-кассе (legacy data / UI) | Снова ломается expected_cash | `role` на кассах; формула без warehouse в shift; убрать выбор POS в складе |
| R4 | Нет `pos_branch` для филиала | 400 / неверная касса | Admin checklist; `branch_cashbox_not_configured` |
| R5 | Checkout без open shift | Некуда писать income | `shift_required` или fallback pos_main (политика) |

### 4.2. Операционные

| # | Рisk | Последствие | Митигация |
|---|------|-------------|-----------|
| R6 | Деньги из ящика на закупку физически, в системе — expense_variable | Ящик и ledger расходятся | Процесс «выдача из кассы» (фаза 2) или инструкция кассиру |
| R7 | Неверный `closing_cash` | Ложное расхождение | Обучение; Z-отчёт + payment_breakdown |
| R8 | Pending reject без cascade на BE | Продажа есть, cashflow rejected — рассинхрон | BE reject cascade обязателен до флага |
| R9 | Исторические cashflows на wrong cashbox | Аналитика кассы «кривая» | Миграция role; не пересчитывать старые смены |
| R10 | i18n в `source_business_operation_id` (legacy) | Reject не находит source_kind | Маппинг legacy строк; только `source_kind` для новых |

### 4.3. Технические

| # | Риск | Последствие | Митигация |
|---|------|-------------|-----------|
| R11 | Неидемпотентный checkout/pay | Дубли cashflow | idempotency_key / unique (source_kind, source_id) |
| R12 | Checkout OK, cashflow fail без rollback | Paid sale без кассы | Атомарная транзакция |
| R13 | WS `market.cashflow.*` не шлётся | Нет toast о движении | realtime-notifications-backend.md |
| R14 | Split / debt+prepay edge cases | Неверная сумма flows | Тест-кейсы из auto-cashflows-backend.md |

---

## 5. Недостатки и пробелы

### 5.1. Бэкенд (to-do)

- Вся логика `resolve_cashbox`, atomic cashflows, `drawer_expected_cash`, reject cascade — **только в ТЗ**.
- `expected_cash` с API **по-прежнему** может включать закупки до фикса BE.

### 5.2. Фронт (статус на момент handoff)

| Область | Статус |
|---------|--------|
| Checkout, open shift, pay debt клиента | ✅ `branch_id`, `cashbox_role`, `shift_id`; без выбора кассы |
| Pay debt поставщику (`DebtModal`) | ✅ `cashbox_role: expense_variable` |
| `AddProductPage`, `useProductSubmit`, `useAddProductSubmitFlow` | ✅ `cashbox_role: expense_variable` + `payment_mode` |
| `AddProductModal`, `MarriageModal`, `AcceptPendingModal` | ✅ routing в PATCH/create; picker кассы убран |
| `SupplierReceipt` | ✅ убран dropdown кассы; `buildExpenseVariableRouting()` в POST receipt |
| `AddModal`, `AddProductBarcode` | ✅ `cashbox_role` в payload create; без `cashBoxes[0]` |
| `SupplierReturnForm` (cash) | ✅ подсказка про expense_variable; API без обязательного `cashbox_id` |
| Legacy `postCashflowIfNeeded` | ⚠️ no-op без cashbox — норма при `VITE_BE_CASHFLOWS=true`; dead `selectCashBox` удалён |
| `CloseShiftPage` | ✅ локальный drawer expected + предупреждение до BE полей |

### 5.3. Продуктовые пробелы (Phase 2)

| Пробел | Описание |
|--------|----------|
| Нет «выдачи из ящика» | Физическая закупка из ящика не отражается в двух регистрах |
| Нет transfer между кассами | POS → expense_variable вручную через /kassa |
| Нет блокировки закрытия при большом минусе | UX: кассир может закрыть с огромным расхождением |
| Нет `non_drawer_expenses_total` с API | FE оценивает drain эвристикой на CloseShiftPage |
| Исторические смены | Старые −20 806 не исправятся автоматически |
| Тариф «Старт» vs pending | Разная политика status — путаница в pending |
| 5 касс, «Касса 2» | role не задан в API — fallback по name ненадёжен |
| Analytics `open_shift_expected_cash` | Может не совпадать с drawer_expected после изменений |

### 5.4. Тестирование

- E2E с реальным BE — см. [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md).
- Unit-тесты FE: `cashboxResolution`, `postCashflowIfNeeded`, `paymentBreakdown` — есть; интеграции с API нет.

---

## 6. Чек-лист готовности к prod

### Бэкенд

- [ ] `role` + `branch_id` на Cashbox, миграция данных
- [ ] `resolve_cashbox()` по алгоритму из auto-cashflows-backend.md
- [ ] Atomic cashflows на checkout, pay, product create, receipt, returns
- [ ] `expected_cash = drawer_expected_cash` (без warehouse на POS)
- [ ] `drawer_expected_cash`, `non_drawer_expenses_total` в shift API
- [ ] Reject cascade по `source_kind`
- [ ] `AUTO_CASHFLOWS=true`
- [ ] WS уведомления (опционально v1.1)

### Фронт

- [x] Маршрутизация без `cashBoxes[0]` (склад, касса, долги)
- [ ] `VITE_BE_CASHFLOWS=true` на staging/prod **после** BE
- [ ] Smoke по [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md)

### QA (сценарий регрессии)

Полный клиентский прогон: **[QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md)**. Кратко:

1. Open shift филиала → checkout cash → close: expected = opening + cash_sales.
2. 15 закупок cash → **expected смены не меняется**.
3. Pay debt клиента → income на POS.
4. Pay debt поставщика → `supplier_debt_payment` expense на variable.
5. Reject pending sale → sale отменена.
6. Manual /kassa → работает.
7. Split payment → 2 cashflows или корректная агрегация.
8. Pure debt checkout → cashflows [].

---

## 7. Хронология выката (рекомендуется)

```
1. BE: role на кассах + resolve_cashbox (без auto cashflows) — smoke open shift
2. BE: drawer_expected_cash formula fix — регрессия кейса 54 625
3. BE: atomic cashflows на checkout + pay
4. BE: warehouse/receipt/returns cashflows
5. BE: reject cascade
6. Staging: AUTO_CASHFLOWS + VITE_BE_CASHFLOWS одновременно
7. Prod: то же + мониторинг 48ч
8. QA: [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md) на staging
9. (опционально) Удалить legacy postCashflowIfNeeded для auto-ops — отдельный релиз
```

---

## 8. Связанные документы

| Документ | Содержание |
|----------|------------|
| [auto-cashflows-backend.md](./auto-cashflows-backend.md) | Полный контракт API |
| [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md) | Формула expected_cash |
| [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md) | Z-отчёт по способам оплаты |
| [realtime-notifications-backend.md](./realtime-notifications-backend.md) | WS после cashflow |
