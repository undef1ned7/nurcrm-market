# Flutter: возврат продажи и заявки на правку/отмену кассы

Контракт для мобильного клиента: возврат чека POS (полный/частичный) с компенсирующим движением по кассе, и approval-gated заявки на редактирование/отмену уже одобренного `CashFlow`.

**Веб-экраны:**
- `/crm/sell` → история продаж → «Возврат продажи» (`RefundPurchase`)
- `/crm/market/cashier` — кассир
- `/crm/market/cashier/:id` (kassa-worker → «Все / Приход / Расход» + вкладка «Запросы»)
- `/crm/kassa/:id` (CafeKassa → детали кассы)

**Веб-код (эталон):**
- `src/shared/lib/tools/saleReturn.ts` — `buildSaleReturnPayload`, `buildSaleReturnSignature`, `normalizeSaleStatus`, `isReturnableSaleStatus`
- `src/entities/sale/model/saleThunk.ts` — thunk `returnSale`
- `src/pages/sell/ui/RefundPurchase.tsx` — экран возврата
- `src/entities/cash/lib/cashFlowChangeRequest.ts` — `buildEditRequestPayload`, `buildCancelRequestPayload`
- `src/entities/cash/model/cashSlice.ts` — thunks `requestCashFlowEdit`, `requestCashFlowCancel`
- `src/features/kassa/ui/FlowChangeRequestModal/FlowChangeRequestModal.tsx` — модалка «Изменить/Отменить»
- `src/pages/pending/ui/Pending.tsx` — approve/reject заявок

**Бэкенд-доки:**
- [sale-return-cashflow-backend.md](../backend/kassa/sale-return-cashflow-backend.md)
- [cashflow-edit-cancel-request-backend.md](../backend/kassa/cashflow-edit-cancel-request-backend.md)

**Статус (2026-09-11):**

| Компонент | Статус |
|-----------|--------|
| **Бэкенд — возврат продажи** | Реализовано на **Staging** (2026-09-03), прод не тронут. Известный риск по статусу компенсации — см. §3 |
| **Бэкенд — edit/cancel заявки** | Реализовано на **Staging** (2026-09-04), 13/13 тестов, прод не тронут |
| **Веб nur-market** | Готов на обе фичи; `VITE_CASHFLOW_CHANGE_REQUESTS` — флаг для заявок (по умолчанию выкл в проде) |
| **Flutter** | Реализовать по этому доку; учитывать риски §3, до выката на прод — только staging |

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <accessToken>`.
Таймзона: **Asia/Bishkek (UTC+6)**. Суммы в JSON — **decimal-строки** `"1234.56"`.

---

## Содержание

1. [Возврат продажи POS](#1-возврат-продажи-pos)
2. [Заявки на правку/отмену кассы](#2-заявки-на-правкуотмену-кассы)
3. [Известные риски](#3-известные-риски)
4. [Чеклист Flutter](#4-чеклист-flutter)

---

## 1. Возврат продажи POS

### 1.1 Эндпоинты

| Метод | Путь | Назначение |
|---|---|---|
| `POST` | `/main/pos/sales/{sale_id}/return/` | возврат чека (полный/частичный) |
| `POST` | `/main/agents/me/sales/{sale_id}/return/` | тот же возврат для роли `agent` |

Для `agent` шлётся **только** `idempotency_key` (+ `items` / `is_defect`) — маршрутизацию кассы агентский эндпоинт резолвит сам, поля `branch_id`/`cashbox_role`/`shift_id` не добавлять.

### 1.2 Полный возврат

```http
POST /main/pos/sales/{sale_id}/return/
Content-Type: application/json

{
  "idempotency_key": "f2b1c0de-1234-4a5b-8c9d-000000000001",
  "branch_id": "<uuid|null>",
  "cashbox_role": "pos_branch",
  "shift_id": "<uuid>"
}
```

`items` отсутствует → полный возврат. `branch_id`/`cashbox_role`/`shift_id` — те же поля маршрутизации, что и на checkout (см. [cash-and-cashflows.md](./cash-and-cashflows.md) §3); `shift_id` можно не слать, если Flutter не знает открытую смену — бэк резолвит сам.

### 1.3 Частичный возврат

```json
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

`items[]` — по `sale_item_id` + `quantity`. Разные наборы позиций по одному чеку — независимые частичные возвраты, суммируются.

### 1.4 Брак (is_defect)

```json
{ "idempotency_key": "…", "cashbox_role": "pos_branch", "is_defect": true, "items": [...] }
```

`is_defect=true` управляет **только** судьбой товара (не возвращается на склад, списывается в брак) — деньги клиенту **всё равно возвращаются**, компенсирующий `expense` создаётся как обычно.

### 1.5 Поля запроса

| Поле | Тип | Обяз. | Смысл |
|---|---|:---:|---|
| `idempotency_key` | uuid-строка | да | Ключ дедупа. **Стабилен** для одного выбора позиций: повтор клика / ретрай после сетевой ошибки → тот же ключ. Другой набор позиций или full↔partial → новый ключ. |
| `branch_id` | uuid \| null | нет | Для `resolve_cashbox`. |
| `cashbox_role` | `pos_branch` \| `pos_main` | нет | Роль POS-кассы, куда шёл исходный `pos_sale`. |
| `shift_id` | uuid | нет | Открытая смена кассира, если известна; иначе бэк резолвит сам (§1.7). |
| `items[]` | list | нет | Отсутствует → полный возврат. |
| `is_defect` | bool | нет | Товар не возвращается на склад; на возврат денег не влияет. |

### 1.6 Идемпотентность

Ключ дедупа — **`idempotency_key`**, а НЕ `(source_kind, source_id, type, amount)` — при частичном возврате можно вернуть разные позиции на одинаковую сумму (300 сом за товар A, потом 300 сом за товар B), и дедуп по сумме молча проглотит второй возврат.

- Повторный `POST` с тем же `idempotency_key` → тот же результат (200 + то же тело), **без** второго компенсирующего движения, без повторного отката склада/долга.
- Разные ключи по одному `sale_id` → независимые частичные возвраты.
- Полный возврат уже отменённого чека → `400 {"detail": "Продажа уже отменена."}`.
- Частичный возврат сверх остатка → `400`.

Веб-реализация ключа: `buildSaleReturnSignature(saleId, items)` — детерминированная подпись по отсортированным `sale_item_id:quantity`, используется как основа `idempotency_key`, переиспользуется при ретрае того же выбора (см. `RefundPurchase.tsx` — `idempotencyRef`).

```dart
/// Стабильная подпись возврата — для переиспользования idempotency_key при ретрае.
String buildSaleReturnSignature(String saleId, List<SaleReturnItem>? items) {
  if (items == null || items.isEmpty) return '$saleId:full';
  final parts = items.map((it) => '${it.saleItemId}:${it.quantity}').toList()..sort();
  return '$saleId:partial:${parts.join('|')}';
}
```

### 1.7 Касса и смена возврата

**Касса** (`_resolve_return_cashbox`):
1. Касса чекаута исходного чека (`sale.cashbox`), если POS-роли — используется в первую очередь (аудит: возврат идёт туда же, куда пришли деньги).
2. Иначе `resolve_cashbox(branch_id, cashbox_role)` из payload.
3. Иначе — `pos_main` компании.

**Смена** (`_resolve_return_shift`):

| Ситуация | Куда привязан `expense` |
|---|---|
| Смена исходного чека открыта | В неё же |
| Смена исходного чека закрыта/отсутствует | В текущую открытую смену кассира на этой кассе; `cash_diff` закрытой смены не пересчитывается |
| У кассира нет открытой смены | `shift=null`, `affects_shift_drawer=false`; возврат **не блокируется** |
| В payload пришёл `shift_id` | Используется, если смена открыта и принадлежит этой кассе; иначе — правила выше |

### 1.8 Статусы чека после возврата

| Возврат | `sale.status` |
|---|---|
| Полный | `canceled` |
| Частичный | `partially_returned` (новый статус) |

`partially_returned` — чек снова доступен для возврата остатка (`isReturnableSaleStatus` включает `paid`, `debt`, `partially_returned`).

```dart
enum SaleStatus { paid, debt, partiallyReturned, canceled, unknown }

bool isReturnableSaleStatus(SaleStatus s) =>
    s == SaleStatus.paid || s == SaleStatus.debt || s == SaleStatus.partiallyReturned;
```

### 1.9 Компенсирующее движение кассы

При успешном возврате (полном или частичном) бэк в той же транзакции, что откатывает склад/долг, создаёт **компенсирующий `expense`** — историческая `pos_sale` income-запись **не удаляется** (аудит сохраняется), а нетится обратным движением.

| Поле | Значение |
|---|---|
| `type` | `expense` |
| `source_kind` | **`pos_sale_return`** (НЕ `product_return` — это отдельная бизнес-операция со своим reject cascade) |
| `source_id` | `sale.id` |
| `amount` | сумма фактически возвращённых денег (`returned_money`, с учётом пропорциональной скидки) |
| `affects_shift_drawer` | `true` для наличной части (уменьшает `drawer_expected_cash`), `false` для безнала/долга |
| `payment_method` | зеркалит способ оплаты исходного чека; при split — по одному `expense` на каждый непустой способ |

Split-возврат: 600 нал + 400 карта, возврат 50% → 2× `expense`: 300 cash (`drawer=true`) + 200 card (`drawer=false`). Чистый долг (денег не было) → `CashFlow` не создаётся, только откат долга клиента.

### 1.10 Reject cascade для `pos_sale_return`

| Действие | Поведение |
|---|---|
| `PATCH /construction/cashflows/{id}/ {status: rejected}` для `pos_sale_return` | `409 reject_cascade_failed` — «раз-вернуть» чек нельзя, склад/долг уже изменены `/return/` |
| Reject исходного `pos_sale` income по уже возвращённому чеку | `409` либо no-op — движение уже погашено компенсацией |

### 1.11 Пример: ответ `POST /return/` и парсинг на клиенте

```dart
class SaleReturnResult {
  final String saleStatus;         // "canceled" | "partially_returned"
  final List<Cashflow> cashflows;  // компенсирующий expense (1-2 записи при split)
  final String? resolvedCashboxId;
}

Future<void> onReturnSuccess(Map<String, dynamic> response) async {
  final status = normalizeSaleStatus(response['sale']?['status'] ?? response['status']);
  final flows = (response['cashflows'] as List? ?? [])
      .map((e) => Cashflow.fromJson(e as Map<String, dynamic>))
      .toList();
  // обновить бейдж/лейбл чека, показать успех; лента кассы обновится по WS
  // (market.cashflow.created) либо рефетчем при заходе на экран кассы.
}
```

---

## 2. Заявки на правку/отмену кассы

Одобренное движение (`CashFlow`, `status=approved`) **нельзя изменить напрямую**. Правка суммы/типа/названия и отмена — только через заявку, привязанную к той же кассе; она попадает в тот же список «Запросы» (`?status=pending&cashbox={id}`) и требует approve владельцем/ролью с правом одобрения.

### 2.1 Эндпоинты

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/construction/cashflows/?cashbox={id}&status=approved` | лента движений кассы |
| `GET` | `/construction/cashflows/?cashbox={id}&status=pending` | лента заявок (вкладка «Запросы») |
| `POST` | `/construction/cashflows/{id}/edit-request/` | заявка на редактирование |
| `POST` | `/construction/cashflows/{id}/cancel-request/` | заявка на отмену (сторно) |
| `PATCH` | `/construction/cashflows/{id}/` | approve/reject заявки — **тот же контракт**, что и обычный pending cashflow |
| `PATCH` | `/construction/cashflows/bulk/status/` | массовое approve/reject |

Модель заявки — **та же таблица `CashFlow`** (не отдельная сущность): `request_kind` (`edit` \| `cancel` \| `null`), `target_flow` (fk на движение), `proposed` (json), `reason`, `requested_by`.

### 2.2 Заявка на редактирование

```http
POST /construction/cashflows/{target_flow_id}/edit-request/
Content-Type: application/json

{
  "proposed": {
    "name": "Закупка воды (исправлено)",
    "amount": "820.00",
    "type": "expense"
  },
  "reason": "Ошиблись суммой при вводе",
  "idempotency_key": "cfedit-{target_flow_id}-{sha1(proposed+reason)}"
}
```

- `proposed` — сервер принимает и частичный, и полный объект; применяются только переданные поля. Веб шлёт всегда полный `{name, amount, type}`.
- `amount` — decimal-строка, `> 0`.
- `type` — `income` \| `expense`; смена типа разворачивает знак движения на кассе.
- Ответ `201`: `{ id, request_kind: "edit", status: "pending", cashbox, cashbox_name, target_flow: {id, name, amount, type, created_at}, proposed, reason, requested_by: {id, name}, created_at }`.

### 2.3 Заявка на отмену

```http
POST /construction/cashflows/{target_flow_id}/cancel-request/
Content-Type: application/json

{
  "reason": "Дубликат прихода",
  "idempotency_key": "cfcancel-{target_flow_id}"
}
```

Ответ `201` — та же форма, `request_kind: "cancel"`, без `proposed`.

**Отмена по факту approve — БЕЗ компенсирующей записи**: `target_flow.status → rejected`, движение пропадает из ленты/отчётов/аналитики, баланс пересчитывается «без лишних записей» (в отличие от `pos_sale_return`, здесь нет отдельного видимого обратного `expense`). Бизнес-операция (продажа/закупка/долг), на которую ссылался `target_flow`, **не трогается** — откатываются только деньги.

### 2.4 Dart: построение payload

```dart
class ProposedFlowChange {
  final String name;
  final String amount; // decimal-строка
  final String type;   // "income" | "expense"
  ProposedFlowChange({required this.name, required this.amount, required this.type});
  Map<String, dynamic> toJson() => {'name': name, 'amount': amount, 'type': type};
}

Map<String, dynamic> buildEditRequestPayload(
  String targetFlowId,
  ProposedFlowChange proposed,
  String reason,
) {
  final sig = '${proposed.name}|${proposed.amount}|${proposed.type}|$reason';
  return {
    'proposed': proposed.toJson(),
    'reason': reason.trim(),
    'idempotency_key': 'cfedit-$targetFlowId-$sig',
  };
}

Map<String, dynamic> buildCancelRequestPayload(String targetFlowId, String reason) => {
  'reason': reason.trim(),
  'idempotency_key': 'cfcancel-$targetFlowId',
};
```

Валидация перед отправкой: `amount > 0`, `type` ∈ {income, expense}, `name` непустой; сравнить `proposed` с текущими значениями (`hasProposedDiff`) — не слать заявку без реальных изменений.

### 2.5 Approve / reject (без изменений в контракте)

```http
PATCH /construction/cashflows/{request_id}/
{ "status": "approved" }   // применить edit/cancel

PATCH /construction/cashflows/{request_id}/
{ "status": "rejected" }   // отклонить, target_flow не трогается
```

Плюс bulk: `PATCH /construction/cashflows/bulk/status/ { "items": [{ "id", "status" }] }`.

### 2.6 Права

| Роль | Создать заявку edit/cancel | Одобрить/отклонить |
|---|---|---|
| owner / `is_owner_like` | да | да |
| кассир, менеджер | да | **нет** — `403` |

Клиент не делает собственной ролевой проверки для кнопок «Изменить»/«Отменить» и «Одобрить»/«Отклонить» — полагается на `403` с бэка.

### 2.7 Ошибки

| Код | Когда |
|---|---|
| `400` | `proposed.amount <= 0`, пустой `proposed`, неизвестный `type` |
| `403` | нет прав создавать заявку |
| `404` | `target_flow` не найден / не в этой компании |
| `409` | `target_flow` не `approved`; уже есть открытая заявка (тело содержит `existing_request_id`); заявка уже разрешена |
| **`422`** | `target_flow` относится к **закрытой смене** — правки/отмены по закрытым сменам запрещены. Тело: `{"detail": "Движение относится к закрытой смене. Изменения по закрытым сменам запрещены."}` |

`422` показывать как есть из `detail` — без собственного маппинга кода.

### 2.8 Идемпотентность и гонки

- `idempotency_key` уникален на заявке. Повторный `POST` с тем же ключом → `200` (не `201`) и **та же** заявка, без дубля.
- На одном `target_flow` в один момент — не более одной открытой (`pending`) заявки. Второй `POST` → `409 { detail, existing_request_id }`.
- Approve уже разрешённой заявки → `409`.

### 2.9 Real-time

WS-события при approve: `market.cashflow.updated` (edit) / `market.cashflow.deleted` (cancel), группа компании — тот же приёмник, что и для sale-return (`useNotificationsSocket` → `cashFlowRealtimeEventReceived`). Экраны кассы и «Запросы» рефетчат список по `cashbox_id` из события.

---

## 3. Известные риски

Собрано из обоих backend-доков — учитывать в UX, не считать временными ограничениями.

1. **Компенсация возврата может остаться `pending`.** Если политика статуса компенсирующего `expense` (`pos_sale_return`) — «зеркалить статус исходного `pos_sale`» (а не всегда `approved`), то на тарифах с модерацией (не «Старт») исходный `pos_sale` создаётся `pending`, и компенсация тоже будет `pending`. Отчёты и аналитика по умолчанию фильтруют `status=approved` → **возвращённый доход не исчезнет из отчётов немедленно**, пока владелец не одобрит отрицательную запись во вкладке «Запросы». Это бизнес-решение, зафиксированное в backend-доке как открытый вопрос (R4 sale-return); Flutter должен закладывать в UX, что после возврата чека сумма может временно продолжать числиться в приходе кассы/отчёте до аппрува — не считать это багом клиента и не пытаться скрыть запись локально.
2. **`returned_qty` / `returnable_qty` по строке — постоянное ограничение, не временное.** Backend-док не подтверждает поля на строке позиции (`GET /main/pos/sales/{id}/`), по которым можно было бы точно ограничить «Макс. возврат» остатком. Защита от перевозврата реализована через отлов `400` от сервера при попытке вернуть больше, чем осталось — Flutter должен ловить этот `400` и показывать ошибку, **не** полагаться на клиентский расчёт остатка как источник истины.
3. **Reject исходного `pos_sale` после возврата опасен.** Если чек уже прошёл `/return/`, reject исходной income-записи в Pending может дать `409` либо no-op — повторный откат создал бы двойной минус. UI Pending не должен позволять «отменить» уже погашенную возвратом запись без явного предупреждения.
4. **`422` на правку/отмену закрытой смены — постоянное правило, не race condition.** Бэк намеренно запрещает edit/cancel по движениям из закрытых смен (чтобы не пересчитывать уже сформированный `payment_breakdown`/`expected_cash`); Flutter должен показывать это как ожидаемый результат, а не ретраить.
5. **Прод не тронут.** Обе фичи только на Staging на момент документа (2026-09-11) — не включать в прод-сборке Flutter до отдельного подтверждения выката.
6. **Realtime для возврата продажи не подтверждён (R9).** WS `market.cashflow.created` при `pos_sale_return` в backend-отчёте не упомянут явно — приёмник на клиенте общий с cashflow-запросами, но пока событие не начнёт приходить, экран кассы после возврата обновится только при повторном заходе/рефетче, не мгновенно.

---

## 4. Чеклист Flutter

### Возврат продажи

- [ ] `POST /main/pos/sales/{id}/return/` (или `/main/agents/me/...` для агента)
- [ ] `idempotency_key` стабилен для одного набора позиций (переиспользовать при ретрае), новый — при другом наборе/full↔partial
- [ ] Полный возврат — без `items`; частичный — `items[{sale_item_id, quantity}]`
- [ ] `is_defect` не блокирует возврат денег, только судьбу товара
- [ ] Обработка `sale.status`: `canceled` (полный) / `partially_returned` (частичный) — маппинг в `normalizeSaleStatus`
- [ ] Ограничение «Макс. возврат» — best-effort по остатку, но **обязательно** ловить `400` от сервера как источник истины (см. риск №2)
- [ ] Показывать, что после возврата приход может временно остаться в отчёте до аппрува (см. риск №1) — не прятать локально
- [ ] Не давать reject исходного `pos_sale` по уже возвращённому чеку без предупреждения
- [ ] Не звать `PATCH .../{id}/ {rejected}` на `pos_sale_return` записи — ожидать `409`

### Заявки на правку/отмену кассы

- [ ] Кнопки «Изменить»/«Отменить» — только на `approved` записях
- [ ] `POST .../edit-request/` — полный `{name, amount, type}` в `proposed`, `amount > 0`
- [ ] `POST .../cancel-request/` — только `reason` + `idempotency_key`
- [ ] `idempotency_key`: `cfedit-{id}-{sha/signature}` / `cfcancel-{id}` — переиспользовать при ретрае
- [ ] Approve/reject заявки — обычный `PATCH .../{request_id}/ {status}` или bulk, без нового контракта
- [ ] Кнопки approve/reject показывать не по собственной ролевой проверке — полагаться на `403`
- [ ] Обработка `409 existing_request_id` — не давать вторую открытую заявку по тому же движению
- [ ] Обработка `422` на закрытой смене — показать `detail` как есть, не ретраить (см. риск №4)
- [ ] После approve `cancel` — движение пропадает из ленты/отчёта/аналитики **без** отдельной видимой компенсирующей записи (в отличие от sale-return)
- [ ] WS `market.cashflow.updated`/`market.cashflow.deleted` → рефетч ленты кассы и «Запросы» по `cashbox_id`
- [ ] Не включать фичу в прод-сборке, пока backend не выкатан с Staging на прод

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Кассы, cashflows, маршрутизация, смены |
| [cashbox-reports.md](./cashbox-reports.md) | Отчёты кассы (день/месяц/аналитика) |
| [auth-and-api-basics.md](./auth-and-api-basics.md) | Авторизация, базовые правила API |
