# Редактирование / отмена движения кассы через заявку

**Страницы:** `/crm/market/cashier/:id` (kassa-worker → «Все / Приход / Расход»), `/crm/kassa/:id` (CafeKassa → детали кассы), `/crm/market/cashier/:id` → вкладка «Запросы» (`Pending`)
**Статус:** фронт готов (`entities/cash`, флаг `VITE_CASHFLOW_CHANGE_REQUESTS`) · **бэкенд — реализовано на Staging** (2026-09-04, миграция `0025_cashflow_change_requests`, `tests_cashflow_change_requests.py` 13/13). Прод не тронут. Контракт — §11.
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Связанные эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `GET` | `/construction/cashflows/?cashbox={id}&status=approved` | лента движений кассы (экран «Приход/Расход») |
| `GET` | `/construction/cashflows/?cashbox={id}&status=pending` | лента заявок конкретной кассы (вкладка «Запросы») |
| `PATCH` | `/construction/cashflows/{id}/` | смена статуса заявки (`approved` / `rejected`) — **уже есть** |
| `PATCH` | `/construction/cashflows/bulk/status/` | массовое одобрение/отклонение — **уже есть** |
| **`POST`** | **`/construction/cashflows/{id}/edit-request/`** | **NEW — заявка на редактирование движения** |
| **`POST`** | **`/construction/cashflows/{id}/cancel-request/`** | **NEW — заявка на отмену (сторно) движения** |

Читать вместе с: [auto-cashflows-backend.md](./auto-cashflows-backend.md) (маршрутизация касс, reject cascade), [sale-return-cashflow-backend.md](./sale-return-cashflow-backend.md) (компенсирующий `expense`, идемпотентность), [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md).

---

## 1. Задача клиента

> «Возможность (Редактировать / Отменять) Расходы и приходы в кассах. Лучше сделайте так, чтобы оно тоже падало в запросы определённых касс».

Сейчас:

- движение (`CashFlow`, `type=income|expense`, `status=approved`) после создания **нельзя ни изменить, ни отменить** из UI;
- существует только поток «создание новой операции» → `status=pending` → владелец одобряет во вкладке «Запросы» (`Pending`, фильтр `?status=pending&cashbox={id}`);
- ошибочный приход/расход исправляют только на бэке руками.

Нужно: у **каждого одобренного движения** — действия **«Изменить»** и **«Отменить»**. Оба **не применяются сразу**, а создают **заявку, привязанную к той же кассе**, и попадают в тот же список «Запросы» этой кассы. Владелец (или роль с правом одобрения) подтверждает — только тогда изменение/сторно применяется к деньгам.

---

## 2. Что шлёт фронт

Изолированный слой: `src/entities/cash/model/cashSlice.ts` — thunks `requestCashFlowEdit`, `requestCashFlowCancel`.
Модалка: `src/features/kassa-worker/ui/kassa/FlowChangeRequestModal.tsx`.

### 2.1. Заявка на редактирование

```http
POST /api/construction/cashflows/{target_flow_id}/edit-request/
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

- `proposed` — только изменённые поля (фронт шлёт все три: `name`, `amount`, `type`), сервер сравнивает с текущим состоянием `target_flow`.
- `amount` — строка, десятичная, `> 0`.
- `type` — `income` | `expense`. Смена типа = разворот знака движения на кассе.

### 2.2. Заявка на отмену (сторно)

```http
POST /api/construction/cashflows/{target_flow_id}/cancel-request/
Content-Type: application/json

{
  "reason": "Дубликат прихода",
  "idempotency_key": "cfcancel-{target_flow_id}"
}
```

### 2.3. Одобрение / отклонение заявки (без изменений в контракте)

Фронт продолжает слать существующее:

```http
PATCH /api/construction/cashflows/{request_id}/   { "status": "approved" }   // применить
PATCH /api/construction/cashflows/{request_id}/   { "status": "rejected" }   // отклонить
```

и массовое `PATCH /construction/cashflows/bulk/status/  { "items": [{ "id", "status" }] }`.

---

## 3. Модель заявки

Предлагаемый вариант — **та же таблица `CashFlow`**, чтобы вкладка «Запросы» (`?status=pending&cashbox=`) и bulk-эндпоинт заработали без изменений:

| Поле | Тип | Значение для заявки |
|---|---|---|
| `id` | uuid | id заявки (не трогает `target_flow`) |
| `cashbox` | fk | **= `target_flow.cashbox`** (обязательно, «падает в запросы этой кассы») |
| `status` | str | `pending` при создании → `approved` / `rejected` |
| `request_kind` | str (**NEW**) | `edit` \| `cancel` \| `null` (обычная операция) |
| `target_flow` | fk → CashFlow (**NEW**) | движение, которое правим/отменяем; `null` для обычной операции |
| `proposed` | json (**NEW**) | `{name?, amount?, type?}` — только для `edit` |
| `reason` | str (**NEW**) | причина от инициатора |
| `requested_by` | fk → User (**NEW**) | кто создал заявку |
| `type` | str | для `edit` — предлагаемый `type`; для `cancel` — тип, обратный `target_flow.type` (для превью в списке) |
| `amount` | decimal | для `edit` — предлагаемая сумма; для `cancel` — `target_flow.amount` |
| `name` | str | для `edit` — предлагаемое имя; для `cancel` — `«Отмена: {target_flow.name}»` |
| `idempotency_key` | str (**NEW**, unique) | защита от дублей заявок |

`GET /construction/cashflows/?status=pending&cashbox={id}` должен возвращать эти поля (`request_kind`, `target_flow` — вложенным объектом с `id, name, amount, type, created_at`, `proposed`, `reason`, `requested_by`), чтобы фронт показал «было → станет».

> Альтернатива — отдельная модель `CashFlowChangeRequest` + свои эндпоинты списка. Тогда фронту нужен второй список и второй bulk. **Предпочтителен вариант «в той же таблице»** — см. вопрос R1.

---

## 4. Что делает бэк при одобрении

`PATCH {request_id} {status: "approved"}` — атомарно:

### 4.1. `request_kind = "edit"`

1. Проверить, что `target_flow.status == "approved"` и по нему нет другой открытой заявки (иначе `409`).
2. Применить `proposed` к `target_flow` (`name`, `amount`, `type`).
3. Пересчитать баланс кассы: снять прежний эффект `target_flow`, применить новый (Δsum, смена знака при смене `type`).
4. Если `target_flow.affects_shift_drawer` и смена открыта — скорректировать `drawer_expected_cash` на дельту.
5. `request.status = "approved"`, проставить `resolved_by`, `resolved_at`.
6. WS-событие `cashflow.updated` (см. [realtime-notifications-backend.md](./realtime-notifications-backend.md)).

### 4.2. `request_kind = "cancel"`

1. Те же проверки, что в 4.1.1.
2. `target_flow.status = "rejected"` (или `canceled` — см. R4), **исключить из всех агрегатов** (лента, отчёт кассы день/месяц, аналитика «Финансы», `payment_breakdown`).
3. Создать компенсирующее движение: `type` = обратный, `amount = target_flow.amount`, `source_kind = cashflow_cancel`, `status = approved`, `idempotency_key = "cfcancel-apply-{target_flow.id}"` — **по образцу `pos_sale_return`** из [sale-return-cashflow-backend.md](./sale-return-cashflow-backend.md) §4. Либо просто убрать из агрегатов без компенсации — см. R4.
4. Reject cascade: если `target_flow.source_business_operation_id` указывает на продажу/закупку/долг — **не трогать** исходную бизнес-операцию (в отличие от reject новой заявки), только деньги. См. R5.
5. Корректировка `drawer_expected_cash` как в 4.1.4.
6. `request.status = "approved"`, WS `cashflow.deleted` / `cashflow.updated`.

### 4.3. `status = "rejected"` (для обеих)

`target_flow` не трогаем. `request.status = "rejected"`, `resolved_by/at`. Никаких денежных эффектов.

---

## 5. Права

| Роль | Создать заявку `edit`/`cancel` | Одобрить/отклонить |
|---|---|---|
| `owner` | да | да |
| роль с правом «управление кассой» (R7) | да | да |
| кассир / менеджер | да | **нет** |
| прочие | нет | нет |

Фронт кнопки «Изменить»/«Отменить» показывает всем, у кого есть доступ к экрану кассы; кнопки «Одобрить»/«Отклонить» во вкладке «Запросы» — как сейчас (owner / market). Финальная проверка прав — на бэке.

---

## 6. Идемпотентность и гонки

- `idempotency_key` уникален на таблице заявок. Повторный `POST` с тем же ключом → `200` и **та же** заявка (не 201, не дубль).
- На `target_flow` в один момент — **не более одной** открытой (`pending`) заявки. Второй `POST` → `409 { detail, existing_request_id }`.
- Одобрение уже одобренной/отклонённой заявки → `409`.
- Все денежные эффекты §4 — в одной транзакции с `select_for_update` на `target_flow` и кассе.

---

## 7. Ответы

### `POST .../edit-request/` → `201`

```json
{
  "id": "req-uuid",
  "request_kind": "edit",
  "status": "pending",
  "cashbox": "cb-uuid",
  "cashbox_name": "Касса №1",
  "target_flow": { "id": "flow-uuid", "name": "Закупка воды", "amount": "1000.00", "type": "expense", "created_at": "2026-09-04T10:00:00+06:00" },
  "proposed": { "name": "Закупка воды (исправлено)", "amount": "820.00", "type": "expense" },
  "reason": "Ошиблись суммой при вводе",
  "requested_by": { "id": "u-uuid", "name": "Айбек" },
  "created_at": "2026-09-04T12:30:00+06:00"
}
```

### `POST .../cancel-request/` → `201` — то же, `request_kind: "cancel"`, без `proposed`.

### Ошибки

| Код | Когда |
|---|---|
| `400` | `proposed.amount <= 0`, пустой `proposed`, неизвестный `type` |
| `403` | нет прав создавать заявку |
| `404` | `target_flow` не найден / не в этой компании |
| `409` | `target_flow` не `approved`; уже есть открытая заявка (`existing_request_id`); заявка уже разрешена |
| `422` | `target_flow` в закрытой смене и правки по закрытым сменам запрещены (см. R6) |

---

## 8. Вопросы к бэкенду (R1–R8)

| # | Вопрос |
|---|---|
| **R1** | Заявки в той же таблице `CashFlow` (+`request_kind`, `target_flow`) или отдельная модель `CashFlowChangeRequest` со своими эндпоинтами списка/bulk? Фронт-прегг сделан под **ту же таблицу**. |
| **R2** | Имена эндпоинтов: `/{id}/edit-request/` + `/{id}/cancel-request/`, или один `/construction/cashflow-requests/` с телом `{target_flow, kind, proposed}`? |
| **R3** | `proposed` — принимать частичный объект (только изменённые поля) или всегда полный `{name, amount, type}`? Фронт готов слать полный. |
| **R4** | Отмена: создавать **компенсирующее** обратное движение (как `pos_sale_return`) или просто переводить `target_flow` в `rejected`/`canceled` и убирать из агрегатов? Влияет на историю и отчёты. |
| **R5** | Если у `target_flow` есть `source_business_operation_id` (Продажа/Закупка/Долг): отмена движения **не** трогает бизнес-операцию, верно? Или запрещаем `cancel` для таких движений (только `edit` суммы недоступен, отмена — через возврат продажи)? |
| **R6** | Правки/отмены по движениям из **закрытой смены** — разрешены? Если да — как корректируется уже сформированный `payment_breakdown` / `expected_cash` той смены? Если нет — код `422`. |
| **R7** | Есть ли уже флаг доступа «управление кассой» помимо `role == "owner"`? Если нет — вводим `can_manage_cashbox` (см. §5). Одобрение заявок `edit`/`cancel` — только owner (по умолчанию), как и текущая вкладка «Запросы». |
| **R8** | WS-события: `cashflow.updated` при одобрении `edit`, `cashflow.deleted` (или `.updated`) при `cancel` — по каналу кассы/компании из [realtime-notifications-backend.md](./realtime-notifications-backend.md)? Нужны для live-обновления ленты у кассира. |

---

## 9. Тест-сценарии

| # | Действие | Ожидание |
|---|---|---|
| 1 | `edit-request` суммы `1000→820` по approved `expense`, затем approve | `target_flow.amount=820`; баланс кассы `+180`; отчёт кассы за день `-180` к расходу; заявка `approved` |
| 2 | `edit-request`, затем reject | `target_flow` без изменений; заявка `rejected` |
| 3 | `edit-request` со сменой `type` `expense→income` | после approve знак движения на кассе развёрнут; income-агрегат `+amount`, expense-агрегат `-amount` |
| 4 | `cancel-request` по approved `income` `500`, approve | `income` уходит из ленты/отчёта/аналитики; баланс кассы `-500`; (R4) компенсирующий `expense 500` `source_kind=cashflow_cancel` |
| 5 | два `edit-request` подряд по одному `target_flow` | второй → `409 existing_request_id` |
| 6 | повтор `POST edit-request` с тем же `idempotency_key` | `200`, та же заявка, без дубля |
| 7 | approve `edit`, когда `target_flow` уже `rejected` (успели отменить) | `409`, деньги не двигаются |
| 8 | кассир создаёт `cancel-request` | `201 pending`; кассир **не** видит кнопку approve; owner одобряет — применяется |
| 9 | заявка по кассе A не видна в списке `?cashbox=B` | список заявок строго по своей кассе |
| 10 | `edit-request` с `amount=0` / `-5` | `400` |
| 11 | `cancel` движения с `affects_shift_drawer=true` в открытой смене | `drawer_expected_cash` уменьшен на `amount` |
| 12 | bulk approve: 1 обычная операция + 1 `edit` + 1 `cancel` | все три применяются корректно, атомарно по каждой |

---

## 10. Порядок выката

1. BE: миграция (`request_kind`, `target_flow`, `proposed`, `reason`, `requested_by`, `idempotency_key`), эндпоинты, применение при approve, тесты.
2. BE: `GET /construction/cashflows/` возвращает новые поля.
3. FE: снять фичефлаг `VITE_CASHFLOW_CHANGE_REQUESTS` (по умолчанию выкл до готовности BE) — кнопки «Изменить»/«Отменить» и превью «было → станет» во вкладке «Запросы».
4. QA по §9 на staging, прод — после.

---

## 11. Ответы BE (2026-09-04, Staging)

| # | Вопрос | Ответ BE | Совпадает с FE-преггом? |
|---|---|---|---|
| R1 | Та же таблица `CashFlow` или отдельная модель? | Та же таблица `CashFlow`, `status="pending"`, `request_kind="edit"` \| `"cancel"` | ✅ — ровно то, под что писан `entities/cash` |
| R2 | Имена эндпоинтов | `POST .../{id}/edit-request/`, `POST .../{id}/cancel-request/`; approve/reject — стандартный `PATCH .../{request_id}/ {status}` или bulk | ✅ пути и payload совпадают 1:1 с `cashSlice.ts` |
| R3 | Формат `proposed`: частичный или полный? | Принимает **и частичный, и полный** объект; применяются только переданные поля; `amount > 0` | ✅ FE шлёт полный `{name, amount, type}` — совместимо |
| R4 | Отмена: компенсирующее движение или просто `rejected` + исключение из агрегатов? | **Без компенсирующей записи**: `target_flow.status → rejected`, движение пропадает из ленты/отчётов/аналитики, баланс возвращается «без лишних записей» | ✅ FE не рендерит отдельно компенсирующую запись — ничего не менять |
| R5 | Отмена трогает бизнес-операцию (продажу/закупку/долг)? | **Нет** — корректирует только кассовые деньги, бизнес-операция не трогается | ✅ как и предполагалось |
| R6 | Правки/отмены по закрытой смене | Запрещены, `422 {"detail": "Движение относится к закрытой смене. Изменения по закрытым сменам запрещены."}` | ✅ `validateResErrors` статус-агностичен, читает `detail` из тела любой ошибки — сообщение всплывёт в модалке как есть |
| R7 | Права: кто создаёт / кто одобряет | Создают: кассир, менеджер, owner. Одобряют/отклоняют: **только owner или `is_owner_like`** | ✅ FE и так не делает своей ролевой проверки на кнопки «Изменить»/«Отменить» (показывает всем с доступом к экрану кассы) и не скрывает «Одобрить/Отклонить» в `Pending` — опирается на 403 с бэка, как договаривались в §5 |
| R8 | WS-события | При approve: `market.cashflow.updated` (edit) / `market.cashflow.deleted` (cancel) в группу компании | ✅ **подключено на FE** (2026-09-04) — `useNotificationsSocket` слушает `market.cashflow.updated/deleted/created` (+ дженерик `cashflow.*`), диспатчит `cashFlowRealtimeEventReceived` в `entities/cash`; экраны `/crm/market/cashier/:id`, `/crm/kassa/:id` и `Pending` перезапрашивают свой список по `cashbox_id` из события |

### QA (§9) — 13/13 автотестов BE, включая закрытую смену (422)

Сценарии 1–12 из §9 + отдельная проверка закрытой смены совпадают с описанным контрактом. Ручной прогон на staging (открыть `/crm/market/cashier/:id` с `VITE_CASHFLOW_CHANGE_REQUESTS=true`) — см. §13.

---

## 12. Что осталось

**BE:** выкат на прод после приёмки; текущая версия — только `/staging/backend`.

**FE:**

1. Включить `VITE_CASHFLOW_CHANGE_REQUESTS=true` в staging-сборке (см. `.env.example`) — **не** в прод-билде, пока BE не выкатан на прод.
2. ✅ Готово: `useNotificationsSocket` подписан на `market.cashflow.updated` / `market.cashflow.deleted` / `market.cashflow.created` → рефетч ленты кассы (`useKassa.ts`, `Kassa.tsx`) и списка «Запросы» (`Pending.tsx`) без ручного обновления страницы. Реализация: `src/entities/notification/lib/cashflowRealtimeEvent.ts` (парсинг события) + `entities/cash` (`cashFlowRealtimeEventReceived`, `useCashFlowRealtimeEvent`). **Уточнить у BE** точные имена полей `cashbox_id`/`cashflow_id` в пейлоаде события — FE читает по алиасам (`cashbox_id`/`cashboxId`/`cashbox`, `cashflow_id`/`cashflowId`/`flow_id`/`id`), но лучше свериться с реальным сообщением.
3. Ручной QA-прогон на staging по §13 перед снятием флага в проде.

---

## 13. Ручной прогон на staging (FE)

1. Собрать/задеплоить фронт с `VITE_CASHFLOW_CHANGE_REQUESTS=true` на staging.
2. `/crm/market/cashier/:id` → найти одобренное движение → «Изменить» → поменять сумму → отправить.
   Проверить: заявка появилась в «Запросы» (`?status=pending&cashbox={id}`), исходное движение не изменилось.
3. Одобрить заявку под owner → сумма движения обновилась, баланс кассы пересчитан.
4. Повторить для «Отменить»: одобрить → движение пропало из ленты/дневного отчёта/аналитики «Финансы».
5. Под кассиром/менеджером: создать заявку — ок; попытаться одобрить чужую/свою — `403`.
6. Правка/отмена движения из закрытой смены → `422` с текстом из R6, всплывает в алерте модалки.
7. Два `edit-request` подряд по одному движению → второй `409 existing_request_id`.
8. Повторный `POST` с тем же `idempotency_key` → `200`, та же заявка, без дубля.
