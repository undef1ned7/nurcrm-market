# Сверка наличных в смене (expected_cash)

**Статус бэка:** ✅ исправлено — `drawer_expected_cash`, закупки не уменьшают expected смены  
**Связано:** [auto-cashflows-backend.md](./auto-cashflows-backend.md), [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md)

---

## Симптом (реальный кейс)

| Показатель | Сумма |
|------------|-------|
| Размен при открытии | 50 сом |
| Наличные продажи за смену | 33 768 сом |
| Складские закупки «наличными» (15 операций) | 54 625 сом |
| **expected_cash по системе** | 50 + 33 768 − 54 625 = **−20 806** |
| **Факт в ящике (кассир)** | **8 888** |
| Расхождение | +29 694 сом |

Кассир продал на 33 768, но система вычла 54 625 закупок из **той же POS-кассы**, что и смена. По учёту в ящике «минус», по факту — 8 888.

---

## Корневая причина

Смешаны два разных учёта:

| Учёт | Что это | Касса |
|------|---------|-------|
| **Ящик смены** | Наличные от покупателей + размен | POS (`pos_main` / `pos_branch`, касса смены) |
| **Закупки склада** | Оплата поставщику за товар | **«Переменные расходы»** (`expense_variable`) |

**Ошибка as-is:** закупки создают `expense` на **POS-кассе смены** (часто «Основная касса компании» / первая в списке). Бэк считает:

```
expected_cash = opening_cash + cash_sales_total − SUM(expenses на cashbox смены)
```

Складские расходы **не должны** уменьшать `expected_cash` смены, даже если физически деньги брали из ящика — для этого отдельный процесс (инкассация / выдача в кассу расходов).

---

## Правильная модель

### Две кассы — два потока

```
Покупатель → наличные → POS-касса смены → expected_cash при закрытии
Поставщик  ← оплата   ← Касса «Переменные расходы» (не влияет на смену)
```

### Формула `expected_cash` (обязательно на бэке)

```
expected_cash = opening_cash + cash_sales_total − shift_drawer_outflows
```

Где `shift_drawer_outflows` — только расходы с флагом **`affects_shift_drawer = true`**:

| Включается в смену | Не включается |
|--------------------|---------------|
| Возврат наличных клиенту из ящика | `warehouse_purchase` |
| Инкассация / выдача размена (если есть) | `procurement_receipt` |
| Мелкие расходы из ящика (если явно помечены) | `defect_writeoff` на expense_variable |
| | `supplier_debt_payment` |
| | Любой expense на `expense_variable` / `expense_fixed` |

**Минимальное правило до флага:** в `shift_drawer_outflows` **не входят** cashflows с:

- `source_kind IN (warehouse_purchase, procurement_receipt, defect_writeoff, supplier_return, supplier_debt_payment)`  
- **или** `cashbox.role IN (expense_variable, expense_fixed)`  
- **или** `shift_id IS NULL` при expense с закупки

### Поле на Cashflow (рекомендация)

| Поле | Тип | Default |
|------|-----|---------|
| `affects_shift_drawer` | bool | см. таблицу |
| `shift_id` | uuid, nullable | для POS income — id смены; для закупок — **null** |

| `source_kind` | `affects_shift_drawer` | `shift_id` |
|---------------|------------------------|------------|
| `pos_sale`, `pos_prepayment` | false (income) | смена |
| `debt_repayment` (клиент) | false (income) | смена |
| `supplier_debt_payment` | **false** | **null** |
| `warehouse_purchase` | **false** | **null** |
| `procurement_receipt` | **false** | **null** |
| `defect_writeoff` | **false** | **null** |

---

## Ответ API смены (расширение)

Добавить в `GET /construction/shifts/{id}/` и ответ `close/`:

```json
{
  "opening_cash": "50.00",
  "cash_sales_total": "33768.00",
  "noncash_sales_total": "0.00",
  "expected_cash": "33818.00",
  "drawer_expected_cash": "33818.00",
  "ledger_expected_cash": "33818.00",
  "non_drawer_expenses_total": "54625.00",
  "cash_diff": "-24930.00",
  "closing_cash": "8888.00"
}
```

| Поле | Описание |
|------|----------|
| `drawer_expected_cash` | `opening_cash + cash_sales_total − shift_drawer_outflows` — **это показывать кассиру** |
| `non_drawer_expenses_total` | Сумма закупок/расходов с POS-кассы, но **не влияющих на ящик** (для отчёта) |
| `ledger_expected_cash` | Старое поведение (если нужно для миграции); deprecated |
| `expected_cash` | **= `drawer_expected_cash`** после выката |

Фронт уже считает `drawer_expected` локально как `opening + cash_sales`, пока бэк не отдаёт поле.

---

## Маршрутизация закупок (обязательно)

При создании товара / прихода поставщика:

```json
{
  "cashbox_role": "expense_variable",
  "payment_mode": "cash"
}
```

**Не** привязывать к `shift_id`. **Не** писать на `shift.cashbox`.

См. полный контракт в [auto-cashflows-backend.md](./auto-cashflows-backend.md).

---

## Если деньги физически взяли из ящика

**✅ Реализовано на фронте** — см. [shift-drawer-funding-purchases-backend.md](./shift-drawer-funding-purchases-backend.md).
Кассир отмечает чекбокс «Я заплатил из кассы (ящика) смены» в приходе/закупке/оплате
долга поставщику; фронт **дополнительно** к обычной записи на `expense_variable`
создаёт ручной `expense` на POS-кассе смены через уже существующий эндпоинт
`/crm/kassa` (`POST /construction/cashflows/`) — без изменений на backend,
т.к. `affects_shift_drawer` для таких ручных записей уже реализован (см.
[BACKEND-QUESTIONS.md п.51](./BACKEND-QUESTIONS.md)).

Единственный открытый вопрос к backend — отдать `cashbox` (id) на Shift API,
чтобы фронту не приходилось резолвить кассу смены по роли (см. документ выше, §3).

---

## Чек-лист приёмки

| # | Сценарий | Ожидание |
|---|----------|----------|
| 1 | Смена: 50 размен, 33 768 нал, 0 расходов из ящика | `expected_cash = 33818` |
| 2 | Те же продажи + 54 625 закупок на expense_variable | `expected_cash = 33818` (без изменений) |
| 3 | Закупка ошибочно на POS-кассу смены | **не должно происходить**; если legacy — `non_drawer_expenses_total` в ответе |
| 4 | Закрытие: факт 8 888 | `cash_diff = 8888 − 33818 = −24930` (реальное расхождение кассира) |
| 5 | `cash_sales_total` не включает безнал | без изменений |

---

## Миграция

1. Проставить `role=expense_variable` на «Переменные расходы».
2. Пересчитать `expected_cash` по новой формуле.
3. Исторические cashflows закупок на POS-кассе: не переписывать задним числом в сменах; новые — только на variable.
4. Синхронный выкат с FE: `cashbox_role` в складских API + исправление формулы на бэке.

---

## Фронт (готово)

| Изменение | Файл |
|-----------|------|
| Закупки шлют `cashbox_role: expense_variable` | `useAddProductSubmitFlow`, `useProductSubmit`, `useSupplierReceipt`, `AddModal`, `useAddProductBarcode` |
| Закрытие смены: «ожидаемо по продажам» + предупреждение о закупках | `CloseShiftPage.tsx` |
| Не требовать POS-кассу на складе | `AddProductModal`, `MarriageModal`, `AcceptPendingModal`, `SupplierReceiptModals` |
| Долг поставщику → `expense_variable` | `DebtModal.tsx` |

QA после BE: [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md)
