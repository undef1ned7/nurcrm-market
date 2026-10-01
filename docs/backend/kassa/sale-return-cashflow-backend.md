# Возврат чека (POS) → компенсирующее движение по кассе

**Страницы:** `/crm/sell` → история продаж → «Возврат продажи» (`RefundPurchase`), `/crm/market/cashier`
**Статус:** фронт готов · **бэкенд — реализовано на Staging** (2026-09-03, `tests_pos_sale_return_cashflow.py` 10/10, миграции `construction.0024` + `main.0118`; прод не тронут). Остатки — §17.
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Связанные эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `POST` | `/main/pos/sales/{sale_id}/return/` | возврат чека (полный / частичный), маркета/кассы |
| `POST` | `/main/agents/me/sales/{sale_id}/return/` | тот же возврат для роли `agent` |
| `POST` | `/main/pos/sales/{sale_id}/checkout/` | закрытие чека — здесь создаётся исходный `pos_sale` income |
| `GET` | `/construction/cashflows/` | лента движений кассы (экран «Приход в кассе») |
| `GET` | `/construction/cashboxes/{id}/report/` (день/месяц) | `total_income` кассы — см. [cashbox-reports-backend.md](./cashbox-reports-backend.md) |
| `GET` | аналитика «Финансы» | агрегация тех же `CashFlow` по компании |

Читать вместе с: [scenario-sale-return-cash-override.md](./scenario-sale-return-cash-override.md) (сквозной сценарий «отдали наличными» + чек-лист QA), [auto-cashflows-backend.md](./auto-cashflows-backend.md) (маршрутизация, reject cascade), [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md), [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md).

---

## 1. Проблема (подтверждена на staging)

Эмпирический прогон `_execute_sale_return` / `SaleReturnAPIView` на staging:

```python
# 1. Продажа 1000 сом (cash, статус paid)
# 2. CashFlow(type='income', amount=1000.00, source_kind='pos_sale', status='pending')
# 3. POST /main/pos/sales/{id}/return/  → _execute_sale_return(sale, partial_items=None, is_defect=False)
# РЕЗУЛЬТАТ:
#   sale.status         → canceled
#   Product.quantity    → +1 (товар вернулся на склад)
#   CashFlow            → БЕЗ ИЗМЕНЕНИЙ: income 1000.00 pos_sale всё ещё висит
```

**Корень:** при возврате чека бэк откатывает **склад** и **долг клиента**, но **не трогает кассовое движение**:

- исходный `pos_sale` income‑`CashFlow` не удаляется и не помечается `rejected`;
- обратный `expense`‑`CashFlow` не создаётся.

**Последствие для трёх экранов, на которые жалуется клиент:**

| Экран | Источник | Почему сумма не уходит |
|---|---|---|
| «Приход в кассе» (`/construction/cashflows/`) | лента `CashFlow` | income‑запись остаётся |
| Отчёт кассы (день/месяц) | `Sum(amount, filter=type=income)` | та же запись в сумме |
| Аналитика → «Финансы» | агрегация `CashFlow` по компании | то же |

Разбивка `payment_breakdown` при закрытии смены **корректна** для **полного** возврата (`canceled` попадает в `SKIP_SALE_STATUSES`), но **не** для частичного (чек остаётся `paid` на полную сумму).

---

## 2. Что теперь шлёт фронт

`RefundPurchase` → thunk `returnSale` → `buildSaleReturnPayload`
(`src/shared/lib/tools/saleReturn.ts`, `src/entities/sale/model/saleThunk.ts`).

### 2.1. Полный возврат

```http
POST /main/pos/sales/{sale_id}/return/
Content-Type: application/json

{
  "idempotency_key": "f2b1c0de-1234-4a5b-8c9d-000000000001",
  "branch_id": "<uuid|null>",
  "cashbox_role": "pos_branch" | "pos_main",
  "shift_id": "<uuid>"          // если фронт знает открытую смену; иначе поля нет
}
```

### 2.2. Частичный возврат

```http
POST /main/pos/sales/{sale_id}/return/

{
  "idempotency_key": "…",
  "branch_id": "…",
  "cashbox_role": "pos_branch",
  "items": [
    { "sale_item_id": "<uuid>", "quantity": 2 },
    { "sale_item_id": "<uuid>", "quantity": 1 }
  ]
}
```

### 2.3. Брак (возврат без денег клиенту)

```http
{ "idempotency_key": "…", "cashbox_role": "pos_branch", "is_defect": true, "items": [...] }
```

### 2.4. Роль `agent`

`POST /main/agents/me/sales/{sale_id}/return/` — фронт шлёт **только** `idempotency_key`
(+ `items` / `is_defect`). Маршрутизацию кассы агентский endpoint определяет сам.

### Поля

| Поле | Тип | Обяз. | Смысл |
|---|---|:---:|---|
| `idempotency_key` | uuid‑строка | да | Ключ операции возврата. **Стабилен** для одного выбора позиций: повтор клика / ретрай после сетевой ошибки шлёт **тот же** ключ. Иной набор позиций / полный vs частичный → новый ключ. |
| `branch_id` | uuid \| null | нет | Филиал для `resolve_cashbox`. `null` — компания без филиалов. |
| `cashbox_role` | enum | нет | `pos_branch` (есть `branch_id`) \| `pos_main`. Роль **POS**‑кассы, куда шло `pos_sale`. |
| `shift_id` | uuid | нет | Открытая смена кассира, если фронт её знает. Отсутствует на экране истории продаж — бэк резолвит смену сам (см. §6). |
| `items[]` | list | нет | Отсутствует → **полный** возврат. Присутствует → частичный, по `sale_item_id` + `quantity`. |
| `is_defect` | bool | нет | `true` → товар **не** возвращается на склад (списывается в брак). На денежные проводки влияет по §7. |

Старый бэк неизвестные поля игнорирует — обратная совместимость сохранена.

---

## 3. Целевое поведение бэка

В **той же `@transaction.atomic`**, что и откат склада/долга, `_execute_sale_return` создаёт
**компенсирующее** движение по кассе на сумму фактически возвращённых денег.

```python
from apps.construction.auto_cashflow import create_auto_cashflow

# returned_money — уже считается в _execute_sale_return (пропорциональные скидки учтены)
if returned_money > Decimal("0.00"):
    create_auto_cashflow(
        company=sale.company,
        branch=sale.branch,
        cashbox=_resolve_return_cashbox(sale, payload),   # см. §6
        shift=_resolve_return_shift(sale, request.user),  # см. §6
        user=request.user,
        type=CashFlow.Type.EXPENSE,
        amount=returned_money,
        source_kind=CashFlow.SourceKind.POS_SALE_RETURN,  # НОВЫЙ, см. §4
        source_id=str(sale.id),
        idempotency_key=payload["idempotency_key"],       # ключ дедупа, см. §5
        status=_return_flow_status(sale),                 # см. §8
        affects_shift_drawer=_return_affects_drawer(sale, method),  # см. §9
        name=f"Возврат по чеку №{sale.number or sale.id}",
        payment_method=method,                            # для split — по каждому методу, §10
    )
```

Итог: историческая income‑запись **не удаляется** (аудит сохраняется), но `expense` той же
суммы **нетит** её в `total_income`, отчётах кассы и аналитике «Финансы».

---

## 4. `source_kind` — новый `pos_sale_return`

**Не переиспользовать `product_return`.** `product_return` уже занят складским сценарием
«брак/возврат товара на склад с деньгами» и имеет своё reject‑cascade поведение
(«откат остатка или `409`», [auto-cashflows-backend.md](./auto-cashflows-backend.md) §«Reject cascade»).
Возврат POS‑чека — отдельная операция: склад/долг уже откачены самим `/return/`.

| | Значение |
|---|---|
| `source_kind` | `pos_sale_return` |
| `type` | `expense` (полный **или** частичный) |
| `source_id` | `sale.id` |
| `source_business_operation_id` | `pos_sale_return` (латиницей, **без i18n** — см. R10) |

### Reject cascade для `pos_sale_return`

| Действие бухгалтера | Поведение бэка |
|---|---|
| `PATCH /construction/cashflows/{id}/ {status: rejected}` для `pos_sale_return` | **`409 reject_cascade_failed`** — «раз‑вернуть» чек нельзя: склад/долг уже изменены `/return/`. Правка только через новую бизнес‑операцию (продажа заново). |
| Reject **исходного** `pos_sale` income по уже возвращённому чеку | `409` либо no‑op: движение погашено компенсацией, повторный откат создаст двойной минус. |

Добавить `pos_sale_return` в маппинг `source_kind` ↔ русская подпись (лента `/crm/kassa`, Pending).

---

## 5. Идемпотентность

**Ключ дедупа — `payload["idempotency_key"]`, а не `(source_kind, source_id, type, amount)`.**

Причина: при частичном возврате можно вернуть **разные позиции на одинаковую сумму**
(300 сом за товар A, потом 300 сом за товар B). Ключ по `(source_kind, sale_id, type, amount)`
посчитает второй возврат дублем и **молча его проглотит** → деньги «зависнут» в кассе.

Требования:

1. `CashFlow` получает поле/индекс `idempotency_key` (или отдельная таблица `ReturnOperation`).
2. `UNIQUE (company_id, idempotency_key)` — повторный `POST` с тем же ключом:
   - возвращает **тот же** результат (200 + тело возврата), **не** создаёт второе движение,
   - **не** откатывает склад/долг повторно.
3. Разные `idempotency_key` по одному `sale_id` — независимые частичные возвраты, суммируются.
4. Полный возврат уже возвращённого чека → `400 {"detail": "Продажа уже отменена."}` (как сейчас).
5. Частичный возврат сверх остатка количества → `400` с текстом про превышение (как сейчас).

---

## 6. Какая касса и смена

### Касса

`_resolve_return_cashbox(sale, payload)`:

1. Если у `sale` сохранён `cashbox` (касса чекаута) и он POS‑роли — **брать его** (аудит: возврат идёт в ту же кассу, где был приход).
2. Иначе `resolve_cashbox(branch_id, cashbox_role)` из payload.
3. Иначе (нет и того, и другого) — `pos_main` компании.

### Смена

`_resolve_return_shift(sale, user)`:

| Ситуация | Куда привязать `expense` |
|---|---|
| Смена исходного чека **открыта** | В неё же. |
| Смена исходного чека **закрыта** / отсутствует | В **текущую открытую** смену кассира (`user`) на этой кассе. **Не** трогать `cash_diff` закрытой смены. |
| У кассира **нет** открытой смены | Политика: привязать к кассе **без смены** (`shift=null`), `affects_shift_drawer=False`. Возврат не блокируется. |
| В payload пришёл `shift_id` | Использовать его, если смена открыта и принадлежит этой кассе; иначе — правила выше. |

Историческую `cash_diff` уже закрытых смен **не пересчитывать** (R9).

---

## 7. `is_defect` и деньги

| `is_defect` | Склад | Деньги клиенту | Компенсирующий `expense` |
|:---:|---|---|---|
| `false` / нет | товар возвращается (`Product.quantity += qty`) | возвращаются | **создаётся** на `returned_money` |
| `true` | товар **не** возвращается (брак) | **всё равно возвращаются клиенту** | **создаётся** на `returned_money` |

`is_defect` управляет только судьбой товара. Если бизнес‑правило иное (брак = деньги клиенту
не отдаём) — **явно подтвердить**; тогда при `is_defect=true` и cash‑чеке `returned_money=0`
и компенсации нет, но чек всё равно должен уйти из `total_income` (через смену статуса, §11).

---

## 8. Статус компенсирующего движения

Исходный `pos_sale` создаётся `pending` (кроме тарифа «Старт» → `approved`,
[BACKEND-QUESTIONS.md](./BACKEND-QUESTIONS.md) Q33). Отчёты кассы и аналитика по умолчанию
фильтруют `status=approved` ([cashbox-reports-backend.md](./cashbox-reports-backend.md) §параметры).

**Правило `_return_flow_status(sale)`:**

- Компенсирующий `expense` получает **тот же** статус, что и исходный `pos_sale` этого чека
  (`approved` при «Старте», иначе `pending`), **либо** — предпочтительно — `approved` всегда,
  чтобы возврат немедленно нетил приход в дефолтном (`approved`) отчёте.
- Выбранную политику **зафиксировать в ответе BE** на этот документ.
- Если оба `pending` — при reject исходного income в Pending компенсация тоже должна
  реджектиться каскадом, иначе останется «голый» минус.

---

## 9. `affects_shift_drawer`

Деньги физически покидают ящик только при возврате **наличного** чека.

| Способ оплаты исходного чека | `affects_shift_drawer` компенсации | Эффект |
|---|:---:|---|
| `cash` | **`True`** | уменьшает `drawer_expected_cash` смены — касса сходится при закрытии |
| `card` / `mbank` / прочий безнал | `False` | не трогает ящик, но нетит `total_income` / аналитику |
| `debt` (чистый долг, денег не было) | `False` | `returned_money` по кассе = 0; откат только долга клиента (`adjust_sale_debt_on_return`) |
| `split` (нал + безнал) | по каждой части отдельно (§10) | наличная часть — `True`, безналичная — `False` |

Без этого поля частичный возврат наличных не уменьшит `drawer_expected_cash`, и при закрытии
смены появится ложный «излишек».

---

## 9.1. Переопределение способа возврата денег (реальный инцидент)

**Проблема.** Таблица в §9 жёстко привязывает `affects_shift_drawer` к способу
**исходной** оплаты — система предполагает, что деньги возвращаются тем же способом,
которым были получены. На практике это не всегда так.

**Реальный кейс:** клиент купил товар на 1940 сом, оплатил **переводом**. Оформили
возврат чека (по таблице §9 — `card`/`mbank` → `affects_shift_drawer=False`, ящик не
тронут — корректно, *если* деньги ушли обратно переводом). Тут же клиент купил другой
товар на 1450 сом. Разницу — 490 сом — кассир отдал клиенту **наличными** из ящика,
физически. Ни одна из двух операций (возврат, новая продажа) не учла эти 490 сом как
отток наличности: возврат по правилам §9 не тронул ящик (исходная оплата — перевод),
а новая продажа — отдельная операция, не связанная с возвратом. При закрытии смены
получилась необъяснённая недостача ~500 сом.

**Временное решение на фронте (без изменений на backend):** когда чек оплачен
**целиком одним** безналичным способом (`payment_method` любой, кроме `cash`,
`debt`, `split` — на практике это `card`, `transfer`, а также конкретные банки
чекаута `/crm/market/cashier`: `mbank`, `optima`, `obank`, `bakai`, см.
`SUPPORTED_CHECKOUT_BANKS` в `src/pages/cashier/ui/paymentPage.utils.ts`) и кассир
в модалке возврата (`RefundPurchase.tsx`) отмечает чекбокс «Деньги фактически
отдал наличными», фронт **дополнительно**, после успешного `POST .../return/`,
создаёт ручную запись через уже существующий эндпоинт `/crm/kassa`:

```http
POST /construction/cashflows/
{
  "cashbox": "<id POS-кассы открытой смены>",
  "type": "expense",
  "amount": "1940.00",
  "name": "Возврат наличными (оплата чека была безналом) — чек №a1b2c3d4",
  "status": "approved" | "pending"
}
```

Тот же контракт и та же логика статуса, что в
[shift-drawer-funding-purchases-backend.md](./shift-drawer-funding-purchases-backend.md)
(там разобран практически идентичный класс проблемы для закупок у поставщика). Backend
уже учитывает такие ручные записи в `drawer_expected_cash` — доработок для этого
воркэраунда не требуется.

**Сознательно не покрыто на фронте (нужен фикс на backend):**

1. **Обратное направление** — исходная оплата `cash`, а фактически деньги вернули
   переводом/на карту. Backend по правилу §9 всё равно создаст компенсацию с
   `affects_shift_drawer=True` (раз исходная оплата была cash) и **уменьшит**
   `drawer_expected_cash`, хотя наличные из ящика никуда не делись — получится ложный
   **излишек**. Фронт не может это подавить: нет поля, чтобы попросить backend не
   выставлять `affects_shift_drawer` для конкретного возврата.
2. **Split-оплата** (`payment_method === "split"`) — чекбокс на
   фронте **не показывается**. Для split backend уже создаёт компенсации по каждому
   способу отдельно (§10), наличная доля уже корректно уходит из ящика; без точной
   разбивки по способам на фронте (нет `sale.payments[]` в ответе
   `historySellProductDetail` — не проверялось) нельзя безопасно посчитать сумму
   для ручной записи — есть риск задвоить наличную долю.

**Запрос к backend (настоящий фикс, закрывает оба направления сразу):** добавить
опциональное поле `refund_method: "cash" | "original"` в тело
`POST /main/pos/sales/{sale_id}/return/` (и агентский аналог), и использовать его
вместо вывода из способа исходной оплаты при расчёте `affects_shift_drawer`:

| Исходная оплата | `refund_method` | `affects_shift_drawer` |
|---|---|---|
| `cash` | не передан / `original` | `True` (как сейчас) |
| `cash` | `"cash"` | `True` (без изменений — деньги и так наличные) |
| любой безнал (`card`, `transfer`, `mbank`, `optima`, `obank`, `bakai`, ...) | не передан / `original` | `False` (как сейчас) |
| любой безнал | `"cash"` | **`True`** — новый случай, закрывает описанный инцидент |

Обратное значение (`refund_method: "transfer"` при исходной оплате `cash`, чтобы
отменить `affects_shift_drawer`) — на усмотрение backend, тоже стоит предусмотреть
поле, но это менее частый и менее рискованный (излишек, не недостача) случай.

**Заодно просьба закрыть открытые в §16 вопросы R3/R4/R7** — без ответа на них нет
уверенности, что `affects_shift_drawer` для одиночных безналичных чеков вообще
уже реализовано на бэке так, как описано в §9 (сам документ помечает эти пункты как
`❓ не подтверждено`), что напрямую влияет на корректность воркэраунда выше.

**Подтверждено на проде (23.09):** реальный возврат чека с `payment_method: "mbank"`
(полный, `POST /main/pos/sales/{id}/return/`) — `200 OK`, `status: "canceled"`. Ответ
API содержит `payment_method`, `cash_received`, `change` и **массив `payments[]`**
(`[{ "method": "mbank", "method_display": "Мбанк", "amount": "160.00" }]`) уже в теле
ответа возврата — это снимает часть неопределённости в п.2 выше: `payments[]`
доступен как минимум в ответе `return/`, возможно и в `historySellProductDetail` —
стоит перепроверить и, если так, в будущем можно безопасно поддержать split.

### QA-сценарий (числа из инцидента)

| # | Шаг | Ожидание |
|---|---|---|
| 1 | Открыть смену. Продать товар на 1940 сом, `payment_method=transfer` (или любой банк — `mbank`/`optima`/`obank`/`bakai`) | Обычный `pos_sale` income на `expense`-незатронутую кассу; `drawer_expected_cash` не меняется |
| 2 | Вернуть чек полностью, **не** отмечая «Деньги отдал наличными» | `drawer_expected_cash` не меняется (как раньше — компенсация `affects_shift_drawer=False`) — подтверждено на проде 23.09, `payment_method=mbank` |
| 3 | То же, но с отметкой чекбокса | Появляется ручная запись `expense` 1940 сом на кассу смены; `drawer_expected_cash` уменьшился на 1940 |
| 4 | Частичный возврат 2 позиций из чека с `payment_method=card`, чекбокс отмечен | Сумма ручной записи = стоимость именно этих 2 позиций (не всего чека) |
| 5 | Чек оплачен `split` (нал+карта) | Чекбокс не показывается вообще |
| 6 | Чек оплачен `debt` (чистый долг) | Чекбокс не показывается (возвращать физически нечего) |
| 7 | Нет открытой смены у кассира | Чекбокс не показывается |

---

## 10. Безнал, split, долг

`_execute_sale_return` должен разложить `returned_money` по способам оплаты исходного чека
(таблица `sale.payments`) и создать **по одному** `expense` на каждый непустой способ —
зеркально тому, как `checkout` создаёт по одному `income` на строку split
([BACKEND-QUESTIONS.md](./BACKEND-QUESTIONS.md) Q27).

| Исходная оплата | Возврат |
|---|---|
| Полностью `cash` | 1× `expense`, `payment_method=cash`, `affects_shift_drawer=True` |
| Полностью `card` / `mbank` | 1× `expense`, тем же `payment_method`, `affects_shift_drawer=False` |
| `split` (напр. 600 нал + 400 карта, возврат 50%) | 2× `expense`: 300 cash (`drawer=True`) + 200 card (`drawer=False`) |
| `debt` + предоплата | откат остатка долга (`adjust_sale_debt_on_return`) **+** `expense` на предоплаченную часть по её способу |
| Чистый `debt` | только откат долга, `CashFlow` нет |

Для частичного возврата суммы по каждому способу — пропорционально доле возвращённых позиций
в чеке (та же логика, что уже даёт `returned_money`).

---

## 11. Статус чека и смена

| Возврат | `sale.status` сейчас | Требуется |
|---|---|---|
| Полный | `canceled` | оставить `canceled` (в `SKIP_SALE_STATUSES` — ок) |
| Частичный | не меняется (`paid` / `debt`) | **`partially_returned`** (новый) |

Для `partially_returned`:

- Из `cash_sales_total` / `noncash_sales_total` / `payment_breakdown` смены брать
  **фактическую** сумму чека = `sale.total − Σ returned_money` (а не исходную).
- Либо, если менять агрегацию смены дорого: чек остаётся `paid`, но смена сходится
  **за счёт** компенсирующего `expense` с `affects_shift_drawer=True` (§9). Тогда
  `payment_breakdown` покажет завышенный `income` по способу — **подтвердить**, приемлемо ли
  для клиента, или всё же вводить `partially_returned` + пересчёт.
- `returnable_qty` позиции = `sold_qty − already_returned_qty` (уже так для частичного).

`partially_returned` уже добавлен в `normalizeSaleStatus` / `isReturnableSaleStatus`
(`src/shared/lib/tools/saleReturn.ts`) — такой чек снова доступен для возврата остатка.
**Подтвердить точное значение статуса на проводе** (ожидаем `"partially_returned"`).

---

## 12. Realtime

Сейчас `/return/` шлёт только `invalidate_cache_pattern` (Redis). Нужно:

- WS‑событие `market.cashflow.created` (компенсирующий `expense`) на канал компании/кассы —
  формат из [realtime-notifications-backend.md](./realtime-notifications-backend.md);
- если возврат затронул смену — `market.shift.updated` с новыми `drawer_expected_cash` /
  `cash_sales_total`.

Тогда открытые экраны кассы/отчёта обновятся без ручного релоада (фронт уже слушает
`useNotificationsSocket`). До появления события фронт после `returnSale` рефетчит только
список продаж; кассу/отчёт пользователь увидит свежими при переходе на экран.

---

## 13. Бэкфилл

Возвраты, сделанные **до** выката фикса, компенсирующих движений не имеют → их `total_income`
останется завышенным.

Варианты (выбрать и описать):

1. **Миграция**: пройтись по `sale.status in (canceled, partially_returned)` без парного
   `pos_sale_return` `CashFlow` и создать `expense` задним числом (дата = дата возврата,
   `status=approved`, `affects_shift_drawer=False` чтобы не ломать закрытые смены).
2. Ручная корректировка через `/crm/kassa` (manual `expense`) — для небольшого объёма.
3. Задокументировать разрыв и не трогать историю (если объём мал и клиент согласен).

---

## 14. Матрица тестов (BE)

| # | Сценарий | Ожидаемо |
|---|---|---|
| 1 | Полный возврат cash‑чека 1000 | `sale.canceled`; `expense` 1000 `pos_sale_return`, `affects_shift_drawer=True`, статус по §8; `total_income` дня −1000 |
| 2 | Частичный возврат 2 из 5 позиций | `sale.partially_returned`; `expense` = стоимость 2 позиций (со скидкой); повторный частичный по другим позициям на ту же сумму — **отдельный** `expense` |
| 3 | Повтор `POST` с тем же `idempotency_key` | 200, тот же ответ, **без** второго `expense`, склад не откатан повторно |
| 4 | Повтор полного возврата, новый ключ | `400 "Продажа уже отменена."` |
| 5 | Возврат card‑чека | `expense` `affects_shift_drawer=False`, `payment_method=card`; аналитика «Финансы» −сумма; `drawer_expected_cash` не изменился |
| 6 | Возврат split‑чека (нал+карта), полный | 2× `expense`: cash (`drawer=True`) + card (`drawer=False`) |
| 7 | Возврат чистого долгового чека | только `adjust_sale_debt_on_return`, `CashFlow` нет |
| 8 | Возврат долг+предоплата | откат долга + `expense` на предоплату |
| 9 | Возврат в закрытой смене | `expense` привязан к текущей открытой смене кассира; `cash_diff` закрытой смены не изменился |
| 10 | Возврат без открытой смены | `expense` с `shift=null`, `affects_shift_drawer=False`; возврат не заблокирован |
| 11 | `is_defect=true`, cash‑чек | товар не на складе; деньги/`expense` по §7 |
| 12 | Атомарность: ошибка INSERT `expense` | весь возврат откатан (склад/долг не изменены) |
| 13 | Reject `pos_sale_return` в Pending | `409 reject_cascade_failed` |
| 14 | Роль `agent`, `/main/agents/me/sales/{id}/return/` | компенсация по правилам агентской кассы; `idempotency_key` учтён |
| 15 | Тариф «Старт» | `expense` сразу `approved`, приход нетится в дефолтном отчёте |

---

## 15. Прогон на staging (приложить факт к ответу)

1. Открыть смену. Продать товар за наличные на сумму **X**.
2. `GET /construction/cashflows/` — зафиксировать `pos_sale` income.
3. `GET` дневной отчёт кассы + аналитика «Финансы» — зафиксировать `total_income`.
4. `GET /construction/shifts/{id}/` — зафиксировать `cash_sales_total`, `drawer_expected_cash`.
5. `POST /main/pos/sales/{id}/return/` (полный).
6. Повторить 2–4. **Diff:** появился ли `pos_sale_return` `expense`; изменились ли `total_income`,
   `cash_sales_total`, `drawer_expected_cash`.
7. Повторить весь сценарий для: частичного возврата, карточного чека, split‑чека.
8. Повторный `POST` с тем же `idempotency_key` — убедиться, что второго движения нет.

---

## 16. Статус вопросов к BE

По отчёту BE от 2026-09-03 (Staging):

| # | Вопрос | Статус |
|---|---|---|
| R1 | `source_kind = pos_sale_return` + reject‑cascade (`409`) | ✅ `CashFlow.SourceKind.POS_SALE_RETURN`; `handle_cashflow_reject` блокирует откат чека с проведённым возвратом |
| R2 | Дедуп по `idempotency_key` (не по `source_id+amount`) | ✅ поле `idempotency_key`, модель `SaleReturn` с защитой от дублей по ключу. **Уточнить:** есть ли `UNIQUE (company, idempotency_key)` и что возвращает повтор (200 с тем же телом?) |
| R3 | `affects_shift_drawer`: `True` cash / `False` безнал | ❓ не указано в отчёте — **подтвердить** |
| R4 | Статус компенсирующего `expense` (зеркало vs `approved`) | ❓ не указано — **подтвердить**; от этого зависит, нетится ли приход в дефолтном (`approved`) отчёте сразу |
| R5 | `partially_returned` + пересчёт сумм смены | ⚠️ статус `Sale.Status.PARTIALLY_RETURNED` заведён. **Уточнить:** берётся ли в `cash_sales_total` / `payment_breakdown` фактическая сумма (`total − Σ returned`) или исходная |
| R6 | Split / долг+предоплата — компенсация по способам | ✅ «раздельный возврат смешанных оплат (нал + карта)», «списание задолженности при продажах в долг» |
| R7 | Закрытая смена → текущая открытая; нет открытой → `shift=null` | ❓ не указано — **подтвердить** правило привязки смены |
| R8 | `is_defect=true` — деньги возвращаются, товар не на склад | ✅ «возврат бракованного товара без возврата на склад остатков» (деньги — подтвердить, что `expense` создаётся) |
| R9 | WS `market.cashflow.created` / `market.shift.updated` | ❌ BE для возврата чека не подтверждён (в отчёте не упомянут). **FE-приёмник уже готов** (2026-09-04, тот же механизм, что и для [cashflow-edit-cancel-request-backend.md](./cashflow-edit-cancel-request-backend.md) §11 R8): `useNotificationsSocket` слушает `market.cashflow.created/updated/deleted` и обновляет ленту кассы/«Запросы» по `cashbox_id` из события — как только BE начнёт слать `market.cashflow.created` при `pos_sale_return`, экраны кассы подхватят его без доп. правок на FE. `market.shift.updated` (для `drawer_expected_cash`/`cash_sales_total` смены) пока не обрабатывается — отдельная задача, если понадобится live-обновление открытой смены кассира |
| R10 | Бэкфилл старых возвратов | ❌ не упомянуто → **не сделано**. Нужен план (§13) |
| R11 | Атомарность `expense` + откат склада/долга | ✅ подразумевается (`auto_cashflow.py`, единая обработка); подтвердить тест-кейсом №12 |

### Ответы API, нужные фронту (приложить примеры со Staging)

| Что | Зачем фронту |
|---|---|
| Точное значение `sale.status` при частичном возврате (`"partially_returned"`?) | маппинг в `normalizeSaleStatus`, фильтр `?status=`, лейбл в списке |
| Поля позиции в `GET /main/pos/sales/{id}/`: `returned_qty` / `returnable_qty` на строку | ограничить «Макс. возврат» остатком, а не исходным кол‑вом |
| Тело ответа `POST /return/` (полный / частичный) | `RefundPurchase` показывает результат; нужен `status` и, желательно, суммы возврата |
| Повтор с тем же `idempotency_key` — код и тело | подтвердить, что фронтовый ретрай безопасен |

---

## 17. Что осталось

**BE:**

1. Подтвердить R3, R4, R7 (см. §16).
2. R9 — начать слать `market.cashflow.created` при возврате чека (FE уже готов принять, см. ниже) + `market.shift.updated`.
3. R10 — план бэкфилла возвратов, сделанных до фикса.
4. Прислать примеры ответов API из таблицы §16.
5. Выкат Staging → Prod после приёмки (сейчас только `/staging/backend`).

**FE (готово, ждёт Staging для проверки):**

| Файл | Что сделано |
|---|---|
| `src/shared/lib/tools/saleReturn.ts` | `buildSaleReturnPayload` (payload + `idempotency_key` + маршрутизация), `buildSaleReturnSignature` (стабильный ключ), `normalizeSaleStatus` / `isReturnableSaleStatus` понимают `partially_returned` |
| `src/entities/sale/model/saleThunk.ts` | `returnSale` шлёт `branch_id` / `cashbox_role` / `shift_id` (не для агента) + `idempotency_key` |
| `src/pages/sell/ui/RefundPurchase.tsx` | `idempotencyRef` (переиспользование ключа при ретрае); «Макс. возврат» = остаток (`returnable_qty` / `sold − returned`); подпись «возвращено N из M»; лейбл статуса |
| `src/pages/sell/ui/SellDetail.tsx`, `sell.constants.ts`, `sell.formatters.ts`, `components/sell/SellModals.tsx` | лейбл + бейдж + опция фильтра для `partially_returned` |
| `public/locales/{ru,ky}/translation.json` | `crm.sell.status.partially_returned` |
| `src/shared/lib/tools/saleReturn.test.ts` | покрытие helpers (18 тестов) |
| `src/entities/notification/lib/cashflowRealtimeEvent.ts` + `useNotificationsSocket.tsx` | приёмник `market.cashflow.created/updated/deleted` → `cashFlowRealtimeEventReceived` в `entities/cash` (общий для sale-return и cashflow-edit-cancel-request) |

**FE — доделать после ответов BE:**

- если частичный статус на проводе не `partially_returned` — поправить список вариантов в `normalizeSaleStatus`;
- WS‑приёмник (R9) уже готов и обновит ленту кассы, как только BE начнёт слать `market.cashflow.created` для `pos_sale_return`; для live-обновления открытой смены кассира (`drawer_expected_cash`) понадобится ещё и обработка `market.shift.updated` — не реализована;
- если в ответе позиций не будет `returned_qty` / `returnable_qty` — оставляем как есть (BE режет перевозврат 400, фронт показывает ошибку).
