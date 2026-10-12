# Предоплата по долгу: способ оплаты (наличные / перевод + банк)

**Статус:** фронт готов (2026-10-01), нужен бэк. Фронт уже шлёт новое поле, старый бэк его игнорирует, поведение не меняется.
**Экран:** касса «Магазин» `/crm/market/cashier` → «Оплата» → «Отсрочка» → «Предоплата» → «Наличными» / «Переводом» + банк.
**Эндпоинт:** `POST /main/pos/sales/{sale_id}/checkout/`
**Связанные документы:** [debt-payment-method-backend.md](./debt-payment-method-backend.md) (то же самое для погашения долга, эта задача сделана по его образцу), [auto-cashflows-backend.md](./auto-cashflows-backend.md), [sale-return-cashflow-backend.md §10](./sale-return-cashflow-backend.md), [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md).

---

## 1. Проблема

В UI кассир может указать, что предоплату по долгу внесли **переводом** (МБанк, Optima и т.д.). Но в checkout это раньше не передавалось:

```json
{ "payment_method": "debt", "client_id": "…", "cash_received": "2000.00" }
```

Бэк по [BACKEND-QUESTIONS Q28](./BACKEND-QUESTIONS.md) создаёт `pos_prepayment` на `cash_received` и считает его **наличными**. Последствия, если клиент перевёл предоплату на карту:

| Где | Что происходит |
|---|---|
| Сверка смены | `drawer_expected_cash` растёт на сумму предоплаты, а в ящике этих денег нет → **недостача** при закрытии |
| `cash_sales_total` / `noncash_sales_total` | нал завышен, безнал занижен |
| Возврат чека (§10 sale-return) | «`expense` на предоплаченную часть **по её способу**» → способ = нал → возврат снова двигает ящик, хотя деньги уходят переводом |
| Фискальный чек (если есть) | предоплата пробивается как наличные |

Долг (сделка, остаток, график v2) при этом корректен — проблема только в **способе** поступления денег.

---

## 2. Контракт: новое поле `prepayment_method`

```http
POST /main/pos/sales/{sale_id}/checkout/
{
  "print_receipt": true,
  "client_id": "…",
  "payment_method": "debt",
  "cash_received": "2000.00",          // СУММА предоплаты (как раньше, независимо от способа)
  "prepayment_method": "mbank",        // ← НОВОЕ
  "schedule_version": "v2",
  "debt_schedule": { … },
  "idempotency_key": "…",
  "branch_id": "…", "cashbox_role": "pos_branch", "shift_id": "…"
}
```

| Поле | Тип | Когда шлётся | Значения |
|---|---|---|---|
| `prepayment_method` | string, **необязательное** | только при `payment_method: "debt"` и предоплате > 0 | `"cash"` \| `"mbank"` \| `"optima"` \| `"obank"` \| `"bakai"` \| `"transfer"` |

- Значения те же, что у `payment_method` в checkout и при погашении долга. Банк вне списка checkout (`demir`, `other`) фронт отправляет как `"transfer"`.
- **Нет поля** → `"cash"`. Это текущее поведение, так работают старые клиенты и мобильное приложение.
- **`cash_received` не меняет смысл.** При `payment_method: "debt"` это по-прежнему **сумма предоплаты**, из неё бэк берёт `prepayment` сделки (см. [07-debt-deal-retry-queue.md](../../sale-flow-fixes/07-debt-deal-retry-queue.md)). Поэтому фронт отправляет её и при переводе.

### Почему не `payments[]`

Мы рассматривали вариант `payments: [{ method: "mbank", amount: "2000.00" }]`, как при split. Отказались от него:

- для split `payments[]` должен сходиться с итогом чека; при долге он не сходится (2000 из 10000), и валидация split может вернуть 400;
- `payments[]` и `payment_method` взаимоисключающие (фронт отправляет либо одно, либо другое), а здесь нужен `payment_method: "debt"`;
- отдельное необязательное поле безопасно для старого бэка (неизвестное поле не даёт 400).

Если бэку удобнее хранить всё в `sale.payments`, это внутреннее решение (см. §3.2). Контракт запроса от этого не меняется.

---

## 3. Что нужно от бэка

### 3.1. Принять и провалидировать
- Принять `prepayment_method` при `payment_method: "debt"`. В остальных случаях игнорировать.
- Неизвестное значение → `"transfer"` (как D2 в debt-payment-method), **не 400**.
- Нет предоплаты (`cash_received` пусто или 0) → поле игнорируется.

### 3.2. Сохранить
- Сохранить способ на продаже, чтобы его могли прочитать возврат, отчёты и чек. Рекомендация: строка в `sale.payments` `{ method: <prepayment_method>, amount: <cash_received> }`, та же таблица, по которой возврат раскладывает `returned_money` (§10 sale-return).
- Сохранить `payment_method` на записи cashflow `pos_prepayment` (nullable-поле, которое уже просили в debt-payment-method §2).

### 3.3. Авто-движение `pos_prepayment` (критично)

| `prepayment_method` | `pos_prepayment` income | `affects_shift_drawer` | Влияет на `drawer_expected_cash` |
|---|---|---|---|
| `cash` / нет поля | касса смены (как сейчас) | **True** | **да** |
| `mbank` / `optima` / `obank` / `bakai` / `transfer` | та же касса резолва, что у безналичной продажи `pos_sale` с этим методом | **False** | **нет** |

Делать **ровно как у безналичной продажи** (`pos_sale` с `payment_method: "mbank"`): какой кассе принадлежит приход и как выставляется `affects_shift_drawer`, бэк уже решает для продаж. Предоплата должна использовать ту же логику.

### 3.4. Отчёты смены
- `cash_sales_total` / `noncash_sales_total`: предоплату переводом считать в **безнал**.
- `payment_breakdown`: без изменений, чек целиком в строке `debt` (правило 5 в shift-payment-breakdown). В правиле говорится «предоплата наличными». Просьба уточнить, что для перевода правило то же.

### 3.5. Возврат чека
§10 sale-return: «`debt` + предоплата → `expense` на предоплаченную часть **по её способу**». Способ брать из §3.2. При `prepayment_method ≠ cash` → `expense` с `affects_shift_drawer=False`.

### 3.6. Ответ checkout и чек
- Если ответ checkout содержит `paid_cash` / `paid_card` / `payments[]`, предоплату переводом отдавать в `paid_card`, а `paid_cash = 0`.
- Фискальный чек (eKassa): предоплату переводом пробивать как безнал (тег 1081), а не как наличные.

### 3.7. Идемпотентность
Фронт включает `prepayment_method` в подпись попытки: если кассир сменил способ, генерируется новый `idempotency_key`. На бэке ничего делать не нужно. Повтор с тем же ключом → существующая запись (Q24).

---

## 4. Что сделано на фронте

| Файл | Изменение |
|---|---|
| `src/pages/cashier/ui/paymentPage.utils.ts` | `resolvePrepaymentApiMethod(method, bank)` → `"cash"` / id банка / `"transfer"`; `getPaymentAmounts` учитывает способ предоплаты (сумма на экране оплаты идёт в «безнал», а не в «нал») |
| `src/entities/sale/model/saleThunk.ts` | `productCheckout` принимает и отправляет `prepayment_method` (только если задано) |
| `src/pages/cashier/ui/hooks/usePaymentPage.ts` | при `deferred` + предоплата: `prepayment_method` в checkout и в подписи идемпотентности; чек печатает предоплату переводом как `paid_card`, а `paid_cash` / `cash_received` / `change` обнуляет (бэк эхом отдаёт `cash_received`) |
| `src/pages/cashier/ui/paymentPage.utils.test.ts` | тесты на маппинг способа и разбивку сумм |

**Не менялось:** `cash_received` (сумма предоплаты), `createDeal` (`prepayment` = сумма), фронтовый фолбэк `postCashflowIfNeeded` (при бэковых cashflows он ничего не делает).

---

## 5. Совместимость и выкат

| Бэк | Результат |
|---|---|
| Старый (поле игнорируется) | Как сейчас: предоплата учитывается наличными. Регрессии нет, на фронте чек уже корректный |
| Новый | Предоплата переводом не попадает в ящик, сверка смены сходится |

Синхронный выкат **не нужен**: фронт можно выкатывать первым.

---

## 6. Тест-кейсы (бэк)

Чек на 10 000, отсрочка, предоплата 2 000, график v2 на 8 000.

| # | Запрос | Ожидание |
|---|---|---|
| 1 | без `prepayment_method` | `pos_prepayment` 2000, `affects_shift_drawer=True`, `drawer_expected_cash` +2000 (как сейчас) |
| 2 | `prepayment_method: "cash"` | то же, что №1 |
| 3 | `prepayment_method: "mbank"` | `pos_prepayment` 2000, `payment_method=mbank`, `affects_shift_drawer=False`, `drawer_expected_cash` **без изменений**, `noncash_sales_total` +2000 |
| 4 | `prepayment_method: "foo"` | трактуется как `transfer`, не 400 |
| 5 | №3 + сделка | `deal.prepayment = 2000`, остаток 8000, график не затронут |
| 6 | Возврат чека №3 целиком | откат долга 8000 + `expense` 2000 `payment_method=mbank`, `affects_shift_drawer=False` |
| 7 | Возврат чека №1 целиком | откат долга + `expense` 2000 нал, `affects_shift_drawer=True` |
| 8 | Повтор №3 с тем же `idempotency_key` | 200, без дубля `pos_prepayment` |
| 9 | `payment_method: "cash"` + `prepayment_method: "mbank"` | `prepayment_method` игнорируется |

---

## 7. Вопросы к бэку (P1–P4)

- **P1.** Где храним способ предоплаты: строка в `sale.payments` (рекомендуем) или поле на продаже или сделке?
- **P2.** Нужен ли `prepayment_method` также в `POST /clients/{id}/deals/`, чтобы показывать «Предоплата (МБанк)» в истории сделки? Или сделка возьмёт способ из продажи, когда checkout будет создавать её сам (07-debt-deal-retry-queue)?
- **P3.** Подтвердите, что старые продажи (до выката) остаются наличными, без бэкфилла. Исторически способ предоплаты не сохранялся, восстановить его нельзя.
- **P4.** Мобильное приложение (Flutter) делает тот же checkout. Отправлять ли поле и оттуда? Контракт тот же, поле необязательное.
