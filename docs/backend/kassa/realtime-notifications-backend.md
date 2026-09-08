# Real-time уведомления NurCRM (market + общие)

**Фронт:** `nur-market`  
**Бэкенд:** NurCRM API  
**Статус фронта:** реализовано (toast + колокольчик + WS bridge)  
**Статус бэка:** требуется реализация

> **Для бэкенд-разработчика:** полное ТЗ с моделью, signals, cron, payload по каждому сценарию —  
> **[notifications-backend-implementation.md](./notifications-backend-implementation.md)**

Связано: [auto-cashflows-backend.md](./auto-cashflows-backend.md), WebSocket `/ws/notifications/`.

---

## Зачем

Сейчас на фронте **три канала** обратной связи:

| Канал | Назначение |
|-------|------------|
| **Toast** (`notify.*`) | Мгновенные локальные сообщения (success/error/warning) |
| **Колокольчик** | Персистентные серверные уведомления (REST + WS) |
| **Модалки** (`useAlert`) | Блокирующие ошибки, подтверждения |

Real-time слой подключается **глобально** в `NotificationProvider` (не только в Header), чтобы работать на fullscreen-экранах кассы и продаж.

---

## Архитектура на фронте

```
Бизнес-операция (checkout, закупка…)
    ├─ notify.success / error / warning  → Toast (локально)
    └─ postCashflowIfNeeded({ warnOnFailure }) → toast при partial failure

WebSocket /ws/notifications/?token=…
    ├─ Redux notificationSlice → колокольчик (badge)
    └─ notify.fromRealtime() → Toast (мгновенно)
```

### Ключевые файлы

| Путь | Роль |
|------|------|
| `src/shared/lib/notifications/` | API `notify`, toast store, enum WS-событий |
| `src/shared/ui/Toast/` | UI toast-стека |
| `src/app/providers/NotificationProvider.tsx` | Глобальный WS + toast |
| `src/entities/notification/lib/useNotificationsSocket.tsx` | WS-клиент |
| `src/entities/cash/lib/postCashflowIfNeeded.ts` | `warnOnFailure` для partial cashflow |

### i18n

Ключи в `notifications.*` (`public/locales/ru|ky/translation.json`):

- `notifications.cashflow.partialFailure.*` — предупреждения при ошибке legacy cashflow
- `notifications.debts.paySuccess`, `deleteFailed`
- `notifications.realtime.reconnected`

---

## WebSocket: текущий контракт (уже работает)

**URL:** `wss://{host}/ws/notifications/?token={access_token}`

**Ping:** клиент шлёт `{ "action": "ping" }` каждые 25 с.

**Служебные типы (игнорируются UI):**

```json
{ "type": "connection_established" }
{ "type": "pong" }
{ "type": "unread_count", "count": 3 }
```

**Универсальное уведомление:**

```json
{
  "type": "notification",
  "data": {
    "id": "uuid",
    "title": "Новая продажа",
    "message": "Касса «Основная»: 1 250,00 сом",
    "category": "system",
    "level": "info",
    "is_read": false,
    "created_at": "2026-08-28T09:15:00Z",
    "url": "/crm/market/cashier",
    "cta_label": "Открыть кассу",
    "meta": {
      "company_id": "uuid",
      "cashbox_id": "uuid",
      "sale_id": "uuid",
      "source_kind": "pos_sale"
    }
  }
}
```

Фронт:

1. Кладёт объект в Redux (`notificationReceived`)
2. Показывает toast (`notify.fromRealtime`)
3. Воспроизводит звук (`playNotificationSound`) — кроме suppress-правил для открытого чата консалтинга

---

## Market-события: enum для бэкенда

Фронт распознаёт типы из `MARKET_REALTIME_EVENTS` (`src/shared/lib/notifications/realtimeEvents.ts`):

| `type` / `data.type` | Когда публиковать |
|----------------------|-------------------|
| `market.sale.created` | Checkout POS / sell завершён |
| `market.payment.received` | Оплата подтверждена (в т.ч. split) |
| `market.cashflow.created` | Создан income/expense (auto-cashflow на бэке) |
| `market.cashflow.pending` | Заявка pending на подтверждение в `/crm/pending` |
| `market.product.received` | Оприходование / add product |
| `market.product.status_changed` | pending → accepted/rejected |
| `market.product.written_off` | Списание брака |
| `market.supplier.return` | Возврат поставщику |
| `market.debt.created` | Создан долг (клиент / поставщик) |
| `market.debt.paid` | Погашение долга / взноса |
| `market.debt.overdue` | Просрочка (cron / nightly) |
| `market.shift.opened` | Открытие смены |
| `market.shift.closed` | Закрытие смены |
| `market.stock.low` | Остаток ниже порога |
| `tariff.expiring` | Подписка ≤ 7 дней |
| `system.notification` | Общесистемные |

**Правило:** любой тип с префиксом `market.` обрабатывается как market-событие.

### `level` → toast

| level | Toast |
|-------|-------|
| `success`, `ok` | зелёный |
| `warning`, `warn`, `medium` | жёлтый |
| `error`, `danger`, `critical`, `urgent` | красный |
| иное | синий (info) |

---

## Кому доставлять (группы WS)

Рекомендуемая модель на бэке (Django Channels / аналог):

```
notifications:company:{company_id}          — все сотрудники компании
notifications:company:{company_id}:owners    — владельцы / admin
notifications:cashbox:{cashbox_id}           — кассиры, привязанные к кассе
notifications:warehouse:{warehouse_id}        — складские операции
notifications:user:{user_id}                  — персональные (консалтинг, SLA)
```

### Матрица событий → группы

| Событие | Группы |
|---------|--------|
| `market.sale.created` | `cashbox:{id}`, `company:{id}` |
| `market.cashflow.pending` | `cashbox:{id}`, `company:{id}:owners` |
| `market.product.received` | `warehouse:{id}`, `company:{id}` |
| `market.debt.overdue` | `company:{id}:owners`, `user:{debt_manager}` |
| `market.stock.low` | `warehouse:{id}`, `company:{id}` |
| `tariff.expiring` | `company:{id}:owners` |

Фильтрация по роли — на бэке. Клиент не фильтрует: получает только разрешённое.

---

## REST API (существующий + требования)

### `GET /main/notifications/`

Пагинация, фильтры — без изменений.

**Дополнить ответ:**

```json
{
  "count": 42,
  "unread_count": 5,
  "results": [ { "...": "..." } ]
}
```

`unread_count` уже используется фронтом; обязателен для корректного badge при cold start.

### `POST /main/notifications/{id}/read/`

Без изменений. После mark-read желательно WS:

```json
{ "type": "unread_count", "count": 4 }
```

### `POST /main/notifications/read-all/`

После успеха — WS `{ "type": "unread_count", "count": 0 }`.

---

## Публикация с бэкенда (псевдокод)

```python
def publish_market_notification(
    *,
    company_id: UUID,
    event_type: str,          # market.sale.created
    title: str,
    message: str,
    level: str = "info",
    url: str | None = None,
    meta: dict | None = None,
    group_keys: list[str],    # ["notifications:cashbox:...", "notifications:company:..."]
):
    notification = Notification.objects.create(
        company_id=company_id,
        category="system",
        type=event_type,
        title=title,
        message=message,
        level=level,
        url=url,
        meta=meta or {},
        is_read=False,
    )
    payload = {
        "type": "notification",
        "data": NotificationSerializer(notification).data,
    }
    for group in group_keys:
        channel_layer.group_send(group, {"type": "notification.message", "payload": payload})
    # опционально: unread_count per user
```

**Идемпотентность:** при повторной публикации того же `(company_id, event_type, source_id)` не создавать дубль в БД и не слать второй WS (dedupe по `meta.source_id` + `type`).

---

## Связь с auto-cashflows

При `VITE_BE_CASHFLOWS=true`:

- фронт **не** вызывает `postCashflowIfNeeded` (no-op);
- бэк после бизнес-операции создаёт cashflow **и** публикует `market.cashflow.created`.

Пример payload после checkout:

```json
{
  "type": "notification",
  "data": {
    "type": "market.cashflow.created",
    "title": "Приход в кассу",
    "message": "Продажа №1042: +1 250,00 сом",
    "level": "success",
    "url": "/crm/kassa",
    "meta": {
      "source_kind": "pos_sale",
      "source_id": "sale-uuid",
      "cashbox_id": "cashbox-uuid",
      "amount": "1250.00"
    }
  }
}
```

---

## Partial failure (legacy mode)

Пока `VITE_BE_CASHFLOWS=false`, фронт сам POST-ит cashflow. При ошибке POST:

- операция **не откатывается**;
- показывается toast `notifications.cashflow.partialFailure.*`.

После перехода на auto-cashflows эти toast исчезнут — вместо них бэк шлёт `market.cashflow.created` или ошибку в рамках транзакции.

---

## Чеклист реализации для бэкенда

### P0 — минимум для market real-time

- [ ] Публикация `market.sale.created` после checkout
- [ ] Публикация `market.cashflow.pending` при status=pending
- [ ] Публикация `market.cashflow.created` при auto-cashflow (флаг BE)
- [ ] `unread_count` в REST + WS-событие при изменении
- [ ] Группы `notifications:company:{id}` и `notifications:cashbox:{id}`

### P1 — склад и долги

- [ ] `market.product.received`, `market.product.status_changed`
- [ ] `market.debt.paid`, `market.debt.overdue` (cron)
- [ ] `market.shift.opened` / `market.shift.closed`

### P2 — дополнительно

- [ ] `market.stock.low` (порог в настройках склада)
- [ ] `tariff.expiring` через WS (сейчас частично локально на фронте)
- [ ] i18n title/message на бэке (ru/ky) — опционально, поле `locale`

---

## Тестирование

### Ручная проверка WS

```bash
# wscat / websocat
websocat "wss://stageapp.nurcrm.kg/ws/notifications/?token=ACCESS_TOKEN"
```

Ожидание после checkout другим пользователем:

1. JSON с `type: "notification"`
2. Toast на экране
3. Badge колокольчика +1
4. Звук (если вкладка активна)

### Contract test (рекомендуется на бэке)

- Каждый `market.*` event → запись в `Notification` + WS payload с `id`, `title`, `message`, `is_read: false`
- Dedupe при retry
- `unread_count` монотонен

---

## Миграция фронта (выполнено)

| Было | Стало |
|------|-------|
| `console.warn` при ошибке cashflow | `postCashflowIfNeeded(..., { warnOnFailure: true })` |
| WS только в Header | WS в `NotificationProvider` (глобально) |
| WS → только колокольчик | WS → колокольчик **+ toast** |
| Нет success при оплате долга | `notify.success` в `Debts.tsx` |
| Ошибка удаления долга — console | `notify.error` |

---

## Вопросы / решения

| Вопрос | Рекомендация |
|--------|--------------|
| Toast vs модалка для критичных ошибок | Критичные — модалка; partial failure — toast |
| Дубли toast + колокольчик | Намеренно: toast = сейчас, колокольчик = история |
| Offline | Toast локально; WS reconnect + `notifications.realtime.reconnected` |
| Cafe toast (`NotificationCafeSound`) | Legacy; не используется в market |
