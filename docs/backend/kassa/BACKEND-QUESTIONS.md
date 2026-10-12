# Вопросы к бэкенду после отчёта о реализации модуля «Касса»

**Дата вопросов:** 2026-08-31  
**Дата ответов BE:** 2026-08-31  
**Статус:** ✅ **Все P0/P1 закрыты.** BE готов. FE/Flutter: `VITE_BE_CASHFLOWS=true` / `BE_CASHFLOWS=true`.

**Контекст:** отчёт бэкенда (18/18 unit-тестов) + ответы на этот файл vs ТЗ `docs/backend/kassa/` и фронт `nur-market`.

**Связанные документы:** [README.md](./README.md), [auto-cashflows-backend.md](./auto-cashflows-backend.md), [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md)

---

## Итог для FE

| | |
|---|---|
| **Блокеры** | Нет — все топ-5 из §10 закрыты |
| **Следующий шаг FE/Flutter** | `BE_CASHFLOWS=true` → прогон [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md) |
| **Prod** | BE + все клиенты с `BE_CASHFLOWS=true` |
| **Открытый вопрос** | §8.2 п.55 — backfill отчёт для старых смен (BE не ответил) |

---

## 1. P0 — маршрутизация и fallback кассы

### 1.1. Fallback «первая касса компании» **P0** ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 1 | Fallback на «первую кассу» в `resolve_cashbox`? | **Да**, 7-й уровень в `auto_cashflow.py:221-226`. Если касс нет / ни одна не подошла при `require_cashbox=True` → **400** `{"detail": "Не удалось определить кассу для операции", "code": "cashbox_unresolvable"}` |
| 2 | Для каких `source_kind`? | Аварийный fallback для старых компаний без ролей. Штатно: POS → смена → `pos_branch` → `pos_main`; склад → `expense_variable` |
| 3 | Убрать/ограничить? | После миграции у всех касс есть `role` — fallback **не срабатывает** в штатном режиме |
| 4 | Тест 400? | **Да** — `tests_auto_cashflows.py:72-76` |

**Вывод FE:** приемлемо — fallback только legacy; штатный путь = роли + 400 при неразрешимости.

---

### 1.2. Формула `drawer_expected_cash` **P0** ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 5 | Что в `income_total`? `debt_repayment`? | **Да** — все approved income смены (`type=income`, `status=approved`, `shift=self`), включая погашение долга клиента наличными |
| 6 | Полный список `source_kind` в `income_total` | `debt_repayment`, `shift_drawer_inflow`, `manual`. **`pos_sale`** — отдельно через `cash_sales_total` из `Sale` (без задвоения) |
| 7 | Эквивалентна формуле из ТЗ? | **Да** — складские закупки: `affects_shift_drawer=False`, `shift=None` → не в ящике |
| 8 | `drawer_expected_cash` / `expected_cash` в shift API? | **Да** — `serializers.py:76-148`, без warehouse |
| 9 | `non_drawer_expenses_total`? | **Да** — в `fields` и `to_representation` |

**Уточнение для FE:** после BE live `CloseShiftPage` может показывать `non_drawer_expenses_total` с API вместо эвристики.

---

## 2. P0 — покрытие HTTP-эндпоинтов ✅

### 2.1. `PATCH /main/products/{id}/` ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 10 | Auto-cashflow при `payment_mode=cash`, amount > 0? | **Да** — `ProductRetrieveUpdateDestroyAPIView` |
| 11 | `defect_writeoff` и `product_return`? | **Да** — `CashFlow.SourceKind` + складские документы `apps/warehouse` |
| 12 | Сумма cashflow | Приоритет `cashflow_amount`, иначе `purchase_price × qty` |
| 13 | Идемпотентность PATCH | **Да** — `create_auto_cashflow` по `(company, source_kind, source_id, type, amount)` |

Покрывает FE: `MarriageModal`, `AcceptPendingModal`, `AddProductModal`, `useProductSubmit`.

---

### 2.2. Legacy `PATCH /main/debts/{id}/` ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 14 | Cashflow `debt_repayment`? | **Да** — `create_auto_cashflow`, type=income |
| 15 | Open shift без `shift_id`? | **Да** — `resolve_cashbox` подтягивает смену `request.user` |
| 16 | Отличие от `POST .../deals/.../pay/`? | Единый движок; в `ClientDealPayAPIView` дополнительно разделение клиент/поставщик |

---

### 2.3. Checkout без `shift_id` (`/crm/sell`) ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 17 | Open shift по JWT? | **Да** — `pos_serializers.py:420-455` |
| 18 | Нет смены → 400? | **Да** — `{"shift_id": "У вас нет открытой смены в этой кассе. Откройте смену перед продажей."}` |

---

### 2.4. Agent checkout ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 19 | Тот же `resolve_cashbox` + atomic? | **Да** |
| 20 | `resolved_cashbox_*`, `cashflows[]` в ответе? | **Да** |

---

## 3. P0 — разделение долгов ✅

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 21 | Клиент vs поставщик | **Да.** Клиент → `debt_repayment`, income, POS, смена. Поставщик → `supplier_debt_payment`, expense, `expense_variable`, `shift=None`, `affects_shift_drawer=False` |
| 22 | Как определяется | `deal.client.type in (Client.StatusClient.SUPPLIERS, 'suppliers')` |
| 23 | `shift_id` игнорируется для supplier? | **Да** — для `EXPENSE_VARIABLE_KINDS`: `shift=None`, `affects_shift_drawer=False` принудительно |

---

## 4. P1 — детали auto-cashflow ✅

### 4.1. Идемпотентность ✅

| # | Ответ BE |
|---|----------|
| 24 | Checkout: повтор → существующая запись |
| 25 | `idempotency_key` на pay: **Да**, в `DealPayment` |
| 26 | Повтор → **200** без дубля |

### 4.2. Split / prepayment ✅

| # | Ответ BE |
|---|----------|
| 27 | Split → **отдельный CashFlow** на каждую непустую строку («Продажа (Наличные)», «Продажа (МБанк)»…) |
| 28 | Долг + предоплата → `pos_prepayment` на `cash_received` |
| 29 | Чистый долг → `cashflows: []` |

### 4.3. Supplier receipt / return ✅

| # | Ответ BE |
|---|----------|
| 30 | debt/prepayment без наличных → cashflow **нет**, долг через документ |
| 31 | Return cash → `supplier_return`, income, `expense_variable`, `affects_shift_drawer=False` |
| 32 | `POST .../suppliers/{id}/returns/` на staging | **Да**, развёрнут |

### 4.4. Статус ✅

| # | Ответ BE |
|---|----------|
| 33 | «Старт» → `approved`, иначе → `pending` (`auto_cashflow.py:35-52`) |
| 34 | Единая политика POS + склад |

### 4.5. Reject cascade ✅

| # | Ответ BE |
|---|----------|
| 35 | Таблица cascade = ТЗ |
| 36 | `warehouse_purchase` reject → `Product.delete()` |
| 37 | receipt/return/defect → `unpost_document` + `rejected` |
| 38 | Cascade **полностью на BE** — FE не шлёт DELETE |

---

## 5. P1 — shift API и payment_breakdown ✅

| # | Ответ BE |
|---|----------|
| 39 | Все поля отдаются: `drawer_expected_cash`, `ledger_expected_cash`, `non_drawer_expenses_total`, `resolved_cashbox_*`, `payment_breakdown` |
| 40 | `payment_breakdown` всегда `[]`, не `null` |
| 41 | `cancelled` / `refunded` / `returned` исключены |
| 42 | Агрегация split/debt — **да**, покрыто тестами |

---

## 6. P1 — миграция ✅

| # | Ответ BE |
|---|----------|
| 43 | Миграция `0023` — все кассы получили `role` |
| 44 | `get_inferred_role()` — только runtime fallback при пустом `role` в БД |
| 45 | Касс без роли нет; без ключевых слов → `pos_main` по умолчанию |
| 46 | Старые cashflows: `affects_shift_drawer` default `False` |

---

## 7. P1 — флаги и совместимость ✅

| # | Ответ BE |
|---|----------|
| 47 | `AUTO_CASHFLOWS` — BE готов, atomic auto-движения |
| 48 | `AUTO_CASHFLOWS=false` — старый механизм не ломается |
| 49 | **Staging готов** к переключению FE на `VITE_BE_CASHFLOWS=true` |
| 50 | Контракт соответствует `docs/backend/kassa/` |

---

## 8. P2 — уточнения

| # | Вопрос | Ответ BE |
|---|--------|----------|
| 51 | `shift_drawer_outflow` | **Реализован** (`affects_shift_drawer=True`) — раньше считали Phase 2 |
| 52 | Transfer POS → expense | Только ручные движения `/crm/kassa` |
| 53 | WS `market.cashflow.pending` | **Активен** — `/ws/notifications/` |
| 54 | Исторические смены | Закрытые — зафиксированные данные при close; live-пересчёт только **OPEN** |
| 55 | Backfill/report для старых −20 806 | ⚠️ **Не ответили** |
| 56 | Ручная `/crm/kassa` | Явный `cashbox`, без автоподмены |
| 57 | `SellBuildingModal` | Не затрагивался |
| 58 | Analytics `cashBoxes[0]` на FE | Не влияет на BE-маршрутизацию |

---

## 9. Staging QA (ответ BE)

BE прогнал S1–S12 на своей стороне — **все Pass**:

| # | Сценарий | BE | Результат | Примечание |
|---|----------|-----|-----------|------------|
| S1 | Золотой кейс | Прогнали | **Pass** | Expected 33 818, Diff −24 930 |
| S2 | Закупка не в drawer | Прогнали | **Pass** | `affects_shift_drawer=False` |
| S3 | Pay debt клиента | Прогнали | **Pass** | `debt_repayment` |
| S4 | Pay debt поставщика | Прогнали | **Pass** | `supplier_debt_payment` |
| S5 | Списание брака | Прогнали | **Pass** | `defect_writeoff` |
| S6 | Accept pending cash | Прогнали | **Pass** | `warehouse_purchase` |
| S7 | Supplier return cash | Прогнали | **Pass** | `supplier_return` |
| S8 | Reject pending sale | Прогнали | **Pass** | Cascade delete |
| S9 | Идемпотентность | Прогнали | **Pass** | Без дублирования |
| S10 | Double-click checkout | Прогнали | **Pass** | 1 cashflow |
| S11 | Checkout без смены | Прогнали | **Pass** | 400 |
| S12 | `payment_breakdown` | Прогнали | **Pass** | Массив заполнен |

**Остаётся FE-side:** S9 с DevTools — нет лишнего `POST /construction/cashflows/` при `VITE_BE_CASHFLOWS=true` (BE проверил идемпотентность, не Network FE).

---

## 10. Топ-5 блокеров — статус

| # | Блокер | Статус |
|---|--------|--------|
| 1 | Fallback первая касса | ✅ Legacy-only; штатно роли + 400 |
| 2 | PATCH product (брак, pending, return) | ✅ |
| 3 | Формула drawer + shift API поля | ✅ |
| 4 | Legacy debts + sell без shift_id | ✅ |
| 5 | `AUTO_CASHFLOWS` + синхронный выкат | ✅ Staging готов |

---

## История

| Дата | Автор | Изменение |
|------|-------|-----------|
| 2026-08-31 | nur-market (FE/docs) | Первичная сборка вопросов |
| 2026-08-31 | BE (ответы) | Все пункты кроме §8.2 п.55 |
| 2026-08-31 | nur-market (FE/docs) | Внесены ответы, статус «готов к FE staging» |
