# Уведомления Market / POS — implementation guide для бэкенда

**Фронт:** `nur-market` (готов: WS + колокольчик + toast)  
**Бэкенд:** NurCRM API (Django + Django Channels)  
**Статус бэка:** требуется реализация по этому документу  
**Связано:** [realtime-notifications-backend.md](./realtime-notifications-backend.md) (контракт FE), [auto-cashflows-backend.md](./auto-cashflows-backend.md)

---

## Содержание

1. [Цель и архитектура](#1-цель-и-архитектура)
2. [Модель данных](#2-модель-данных)
3. [WebSocket (Django Channels)](#3-websocket-django-channels)
4. [Сервис публикации](#4-сервис-публикации-create_and_publish_notification)
5. [REST API (контракт с фронтом)](#5-rest-api-контракт-с-фронтом)
6. [Market-сценарии: триггеры и payload](#6-market-сценарии-триггеры-и-payload)
7. [Cron и фоновые задачи](#7-cron-и-фоновые-задачи)
8. [Идемпотентность и dedupe](#8-идемпотентность-и-dedupe)
9. [Приоритеты реализации (P0 → P2)](#9-приоритеты-реализации-p0--p2)
10. [Тестирование и QA](#10-тестирование-и-qa)
11. [Чеклист перед выкатом](#11-чеклист-перед-выкатом)

---

## 1. Цель и архитектура

### 1.1. Гибридная схема

Система использует **два параллельных канала**:

| Канал                                | Назначение               | Когда используется                                       |
| ------------------------------------ | ------------------------ | -------------------------------------------------------- |
| **PostgreSQL** (`Notification`)      | История всех уведомлений | Оффлайн-пользователь прочитает через REST при входе      |
| **WebSocket** (`/ws/notifications/`) | Мгновенная доставка      | Онлайн-пользователь видит toast + badge без перезагрузки |
| **REST API**                         | CRUD + mark read         | Cold start, колокольчик, пагинация                       |

### 1.2. Технический поток

```
[ Бизнес-событие в Market ]
        │
        ▼
[ signals.py / Service Layer ]
        │
        ▼
transaction.on_commit(...)   ← отправка только после успешного commit
        │
        ▼
[ realtime.py: create_and_publish_notification ]
        ├── 1. INSERT Notification (PostgreSQL)
        └── 2. ChannelLayer.group_send(...)
                    │
                    ▼
            [ WebSocket Consumer ]
                    │
                    ▼
            [ Frontend nur-market ]
                ├── Redux → колокольчик (badge)
                └── notify.fromRealtime() → toast + звук
```

### 1.3. Что уже есть на фронте

Фронт **не фильтрует** уведомления по роли — получает только то, что бэкенд отправил в его WS-группу.  
Ключевые файлы FE (для сверки контракта):

| Файл                                                       | Роль                  |
| ---------------------------------------------------------- | --------------------- |
| `src/entities/notification/lib/useNotificationsSocket.tsx` | WS-клиент             |
| `src/entities/notification/api/notification.ts`            | REST-вызовы           |
| `src/shared/lib/notifications/realtimeEvents.ts`           | Enum `market.*` типов |
| `src/app/providers/NotificationProvider.tsx`               | Глобальный WS + toast |

**Важно:** любое поле `title`, `message`, `level`, `url` в payload сразу отображается пользователю. Тексты пишите на русском (или добавьте `locale` — см. P2).

---

## 2. Модель данных

### 2.1. Таблица `Notification`

Рекомендуемая схема (расширить существующую модель, если поля уже есть):

```python
class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    company = models.ForeignKey("Company", on_delete=models.CASCADE, db_index=True)
    recipient = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_index=True,
        help_text="NULL = broadcast через WS-группу, но запись персональная per user",
    )

    # Классификация (для вкладок колокольчика на FE)
    category = models.CharField(max_length=32, default="system")
    # tariff | system | news | other

    type = models.CharField(max_length=64, db_index=True)
    # market.sale.created | tariff.expiring | ...

    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    level = models.CharField(max_length=16, default="info")
    # info | success | warning | error

    url = models.CharField(max_length=512, blank=True, default="")
    cta_label = models.CharField(max_length=64, blank=True, default="")

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    meta = models.JSONField(default=dict, blank=True)
    # source_kind, source_id, cashbox_id, warehouse_id, ...

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
            models.Index(fields=["company", "-created_at"]),
            models.Index(
                fields=["company", "type", "meta"],
                name="notif_dedupe_idx",
            ),  # для dedupe — см. §8
        ]
```

### 2.2. Обязательные поля в API/WS payload

Фронт читает поля в таком порядке приоритета:

| Поле         | Обязательно | Примечание                                                                           |
| ------------ | ----------- | ------------------------------------------------------------------------------------ |
| `id`         | **Да**      | UUID; без id FE генерирует синтетический (`ws-...`) — dedupe в колокольчике ломается |
| `title`      | **Да**      | Заголовок toast / карточки                                                           |
| `message`    | Желательно  | Тело toast; если пусто — используется `title`                                        |
| `level`      | Желательно  | `info` / `success` / `warning` / `error` → цвет toast                                |
| `is_read`    | **Да**      | Всегда `false` при создании                                                          |
| `created_at` | **Да**      | ISO 8601 UTC                                                                         |
| `type`       | **Да**      | Стабильный код события (`market.sale.created`)                                       |
| `category`   | Желательно  | `system` / `tariff` / `news`                                                         |
| `url`        | Опционально | SPA-маршрут, напр. `/crm/pending`                                                    |
| `cta_label`  | Опционально | Текст кнопки в модалке                                                               |
| `meta`       | Опционально | Произвольный JSON для dedupe и навигации                                             |

### 2.3. `meta` — стандартные ключи

```json
{
  "source_kind": "pos_sale",
  "source_id": "uuid-of-sale",
  "company_id": "uuid",
  "cashbox_id": "uuid",
  "warehouse_id": "uuid",
  "branch_id": "uuid",
  "user_id": "uuid",
  "amount": "1250.00",
  "document_number": "1042"
}
```

**Правило:** `source_kind` + `source_id` + `type` используются для dedupe (§8).

---

## 3. WebSocket (Django Channels)

### 3.1. Endpoint

```
wss://{host}/ws/notifications/?token={access_token}
```

- Авторизация: JWT access token (тот же, что REST).
- При невалидном/истёкшем токене: close code **4401** (FE обновит token и переподключится).

### 3.2. Consumer: подключение к группам

При успешной аутентификации пользователь подписывается на группы:

```python
GROUP_USER = f"notif_user_{user.id}"                    # персональные (legacy, уже работает)
GROUP_COMPANY = f"notifications:company:{company_id}"   # все сотрудники компании
GROUP_OWNERS = f"notifications:company:{company_id}:owners"
GROUP_CASHBOX = f"notifications:cashbox:{cashbox_id}"   # per assigned cashbox
GROUP_WAREHOUSE = f"notifications:warehouse:{warehouse_id}"
```

**Минимум для Market:** пользователь должен быть в `notif_user_{user_id}` **и** в группах по его роли (company / cashbox / warehouse).

Пример `connect()`:

```python
async def connect(self):
    user = self.scope["user"]
    if not user.is_authenticated:
        await self.close(code=4401)
        return

    self.user_group = f"notif_user_{user.id}"
    await self.channel_layer.group_add(self.user_group, self.channel_name)

    company_id = user.company_id
    await self.channel_layer.group_add(
        f"notifications:company:{company_id}", self.channel_name
    )

    if user.is_owner_or_admin:
        await self.channel_layer.group_add(
            f"notifications:company:{company_id}:owners", self.channel_name
        )

    for cashbox_id in user.assigned_cashbox_ids:
        await self.channel_layer.group_add(
            f"notifications:cashbox:{cashbox_id}", self.channel_name
        )

    for warehouse_id in user.assigned_warehouse_ids:
        await self.channel_layer.group_add(
            f"notifications:warehouse:{warehouse_id}", self.channel_name
        )

    await self.accept()
    await self.send_json({"type": "connection_established"})
```

### 3.3. Ping / Pong

Клиент шлёт каждые **25 секунд**:

```json
{ "action": "ping" }
```

Ответ сервера:

```json
{ "type": "pong" }
```

### 3.4. Формат исходящих сообщений

#### Служебные (UI игнорирует, кроме unread_count)

```json
{ "type": "connection_established" }
{ "type": "pong" }
{ "type": "unread_count", "count": 5 }
```

#### Универсальное уведомление

```json
{
  "type": "notification",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Новая продажа",
    "message": "Касса «Основная»: 1 250,00 сом",
    "category": "system",
    "type": "market.sale.created",
    "level": "info",
    "is_read": false,
    "created_at": "2026-08-28T09:15:00Z",
    "url": "/crm/market/cashier",
    "cta_label": "Открыть кассу",
    "meta": {
      "source_kind": "pos_sale",
      "source_id": "sale-uuid",
      "cashbox_id": "cashbox-uuid",
      "amount": "1250.00"
    }
  }
}
```

Handler в consumer:

```python
async def notification_message(self, event):
    await self.send_json(event["payload"])
```

### 3.5. Когда слать `unread_count`

После каждого изменения счётчика непрочитанных **для конкретного пользователя**:

| Событие                            | Действие                                    |
| ---------------------------------- | ------------------------------------------- |
| Создано новое уведомление для user | `group_send(notif_user_{id}, unread_count)` |
| `POST .../read/`                   | Пересчитать и отправить                     |
| `POST .../mark-all-read/`          | `{ "count": 0 }`                            |
| `DELETE .../{id}/`                 | Пересчитать и отправить                     |

```python
async def push_unread_count(user_id: int):
    count = await get_unread_count(user_id)
    await channel_layer.group_send(
        f"notif_user_{user_id}",
        {
            "type": "unread.count",
            "payload": {"type": "unread_count", "count": count},
        },
    )
```

---

## 4. Сервис публикации `create_and_publish_notification`

### 4.1. Сигнатура

```python
# apps/main/services/realtime.py

from django.db import transaction

@transaction.atomic
def create_and_publish_notification(
    *,
    company_id: UUID,
    recipient_id: UUID | None,       # кому персонально (запись в БД)
    event_type: str,                 # market.sale.created
    title: str,
    message: str = "",
    level: str = "info",
    category: str = "system",
    url: str = "",
    cta_label: str = "",
    meta: dict | None = None,
    ws_groups: list[str] | None = None,  # доп. группы WS (кроме notif_user)
    dedupe: bool = True,
) -> Notification | None:
    ...
```

### 4.2. Алгоритм

```python
def create_and_publish_notification(...):
    meta = meta or {}

    if dedupe:
        existing = Notification.objects.filter(
            company_id=company_id,
            type=event_type,
            meta__source_id=str(meta.get("source_id", "")),
        ).first()
        if existing:
            return existing  # не дублировать WS

    notification = Notification.objects.create(
        company_id=company_id,
        recipient_id=recipient_id,
        type=event_type,
        category=category,
        title=title,
        message=message,
        level=level,
        url=url,
        cta_label=cta_label,
        meta=meta,
        is_read=False,
    )

    payload = {
        "type": "notification",
        "data": NotificationSerializer(notification).data,
    }

    def _publish():
        layer = get_channel_layer()
        groups = set(ws_groups or [])
        if recipient_id:
            groups.add(f"notif_user_{recipient_id}")
        for group in groups:
            async_to_sync(layer.group_send)(
                group,
                {"type": "notification.message", "payload": payload},
            )
        if recipient_id:
            push_unread_count(recipient_id)

    transaction.on_commit(_publish)
    return notification
```

### 4.3. Хелпер: несколько получателей

Для событий «всем ответственным сотрудникам склада» — **отдельная запись Notification per user**, но один WS payload:

```python
def publish_to_users(
    *,
    user_ids: Iterable[UUID],
    company_id: UUID,
    event_type: str,
    title: str,
    message: str,
    level: str = "info",
    **kwargs,
):
    for user_id in user_ids:
        create_and_publish_notification(
            company_id=company_id,
            recipient_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            level=level,
            ws_groups=[f"notif_user_{user_id}"],
            **kwargs,
        )
```

### 4.4. Где вызывать (signals / services)

| Место                                     | Триггер                                |
| ----------------------------------------- | -------------------------------------- |
| `SaleService.complete_checkout()`         | `market.sale.created`                  |
| `CashflowService.create()`                | `market.cashflow.created` / `.pending` |
| `PendingDocumentService.approve/reject()` | `market.product.status_changed`        |
| `WriteOffService.create()`                | `market.product.written_off`           |
| `SupplierReturnService.create()`          | `market.supplier.return`               |
| `SubrealTransferService.send()`           | `market.transfer.received`             |
| `StockShortageService.create_event()`     | `market.stock.low`                     |
| `ShiftService.open/close()`               | `market.shift.opened` / `.closed`      |
| `DebtService.pay/create()`                | `market.debt.paid` / `.created`        |
| Celery `send_tariff_notifications`        | `tariff.expiring`                      |

**Всегда** оборачивать в `transaction.on_commit` (или вызывать только из `create_and_publish`, где это уже есть).

---

## 5. REST API (контракт с фронтом)

Базовый префикс: `{host}/api`.  
Фронт вызывает пути **без** `/api` (axios baseURL добавляет его).

### 5.1. `GET /api/main/notifications/`

**Query params:**

| Param     | Тип  | Описание                                    |
| --------- | ---- | ------------------------------------------- |
| `limit`   | int  | Размер страницы (FE: 20)                    |
| `offset`  | int  | Смещение                                    |
| `is_read` | bool | Опционально: `false` — только непрочитанные |

**Response (обязательный формат):**

```json
{
  "count": 42,
  "unread_count": 5,
  "results": [
    {
      "id": "uuid",
      "title": "...",
      "message": "...",
      "category": "system",
      "type": "market.sale.created",
      "level": "info",
      "is_read": false,
      "created_at": "2026-08-28T09:15:00Z",
      "url": "/crm/kassa",
      "cta_label": "Открыть",
      "meta": {}
    }
  ]
}
```

**Требования:**

- `unread_count` — **обязателен** (FE использует для badge при cold start).
- Фильтрация: только уведомления **текущего пользователя** (`recipient=request.user`).
- Сортировка: `-created_at`.

### 5.2. `GET /api/main/notifications/{id}/`

Детали одного уведомления. Только если `recipient == request.user`.

### 5.3. `POST /api/main/notifications/{id}/read/`

Пометить прочитанным.

**Response:** `200 OK` + serialized notification (или `{}`).

**После успеха:**

1. `is_read = True`, `read_at = now()`
2. WS → `{ "type": "unread_count", "count": <new_count> }` в `notif_user_{user_id}`

> **Примечание:** в старой документации указан `PATCH` — фронт использует **POST**. Не менять на PATCH без правки FE.

### 5.4. `POST /api/main/notifications/mark-all-read/`

Пометить все непрочитанные текущего пользователя.

**После успеха:** WS → `{ "type": "unread_count", "count": 0 }`.

> **Примечание:** путь `mark-all-read/` (не `mark-all-as-read/`). Это то, что вызывает FE.

### 5.5. `DELETE /api/main/notifications/{id}/`

Удалить уведомление. После удаления — пересчёт `unread_count` + WS.

---

## 6. Market-сценарии: триггеры и payload

Ниже — **полная матрица** событий Market/POS. Типы событий согласованы с FE enum `MARKET_REALTIME_EVENTS` (`src/shared/lib/notifications/realtimeEvents.ts`).

### 6.1. Легенда

| Колонка   | Значение                                                                           |
| --------- | ---------------------------------------------------------------------------------- |
| **Кому**  | `user` = персонально; `owners` = владельцы; `warehouse` = склад; `cashbox` = касса |
| **level** | Цвет toast на FE                                                                   |

---

### 6.2. Передача партии агенту / на филиал (Subreal / Закупка)

**Когда:** отправитель оформил передачу товара агенту или на другой филиал.

**Тип:** `market.transfer.received` _(новый; добавить в FE enum при выкате)_

**Кому:** получатель (агент / управляющий филиала) — `recipient_id` + `notif_user_{id}`

**Пример payload:**

```json
{
  "type": "notification",
  "data": {
    "id": "...",
    "type": "market.transfer.received",
    "category": "system",
    "level": "info",
    "title": "Вам передана новая партия товара",
    "message": "Партия №1247 от склада «Центральный»: 48 позиций",
    "is_read": false,
    "created_at": "2026-09-01T14:05:00Z",
    "url": "/crm/pending",
    "cta_label": "Принять",
    "meta": {
      "source_kind": "subreal_transfer",
      "source_id": "transfer-uuid",
      "warehouse_id": "uuid",
      "branch_id": "uuid",
      "document_number": "1247"
    }
  }
}
```

**Код (псевдо):**

```python
# signals.py — после SubrealTransfer.status = 'sent'
create_and_publish_notification(
    company_id=transfer.company_id,
    recipient_id=transfer.recipient_user_id,
    event_type="market.transfer.received",
    title="Вам передана новая партия товара",
    message=f"Партия №{transfer.number} от склада «{transfer.from_warehouse.name}»: {transfer.items_count} позиций",
    url="/crm/pending",
    cta_label="Принять",
    meta={
        "source_kind": "subreal_transfer",
        "source_id": str(transfer.id),
        "warehouse_id": str(transfer.to_warehouse_id),
        "document_number": transfer.number,
    },
)
```

---

### 6.3. Возврат товара и брак (Return / Defect)

#### 6.3.1. Решение по заявке (approve / reject)

**Когда:** управляющий/склад одобрил или отклонил заявку на возврат или списание брака.

**Тип:** `market.product.status_changed`

**Кому:** инициатор заявки (кассир/агент)

| Решение  | level     | title              |
| -------- | --------- | ------------------ |
| approved | `success` | «Заявка одобрена»  |
| rejected | `warning` | «Заявка отклонена» |

```json
{
  "type": "notification",
  "data": {
    "type": "market.product.status_changed",
    "level": "success",
    "title": "Заявка на возврат одобрена",
    "message": "Документ №892 — брак «Молоко 1л»",
    "url": "/crm/documents",
    "meta": {
      "source_kind": "return_request",
      "source_id": "request-uuid",
      "status": "approved"
    }
  }
}
```

#### 6.3.2. Списание брака (факт операции)

**Тип:** `market.product.written_off`  
**Кому:** инициатор + `notifications:warehouse:{id}`

#### 6.3.3. Возврат поставщику

**Тип:** `market.supplier.return`  
**Кому:** автор операции + owners (если сумма > порога — опционально)

---

### 6.4. Нехватка на складе (StockShortageEvent)

**Когда:** при продаже или производстве зафиксирована нехватка готовой продукции или сырья.

**Тип:** `market.stock.low`

**Кому:** все ответственные сотрудники склада (`warehouse.managers` или роль `warehouse_operator`)

**level:** `warning`

```json
{
  "type": "notification",
  "data": {
    "type": "market.stock.low",
    "category": "system",
    "level": "warning",
    "title": "Нехватка на складе",
    "message": "«Мука высший сорт»: остаток 2 кг, требуется 15 кг для производства",
    "url": "/crm/warehouse",
    "meta": {
      "source_kind": "stock_shortage",
      "source_id": "shortage-event-uuid",
      "warehouse_id": "uuid",
      "product_id": "uuid",
      "required_qty": "15",
      "available_qty": "2"
    }
  }
}
```

**Код:**

```python
# StockShortageEvent post_save
managers = warehouse.get_responsible_users()
publish_to_users(
    user_ids=[u.id for u in managers],
    company_id=event.company_id,
    event_type="market.stock.low",
    title="Нехватка на складе",
    message=format_shortage_message(event),
    level="warning",
    url="/crm/warehouse",
    meta={
        "source_kind": "stock_shortage",
        "source_id": str(event.id),
        "warehouse_id": str(event.warehouse_id),
        "product_id": str(event.product_id),
    },
)
```

---

### 6.5. Тариф и подписка

**Когда:** фоновая задача `send_tariff_notifications` (Celery beat, 1 раз в сутки, ~09:00 Bishkek).

**Тип:** `tariff.expiring`  
**category:** `tariff`  
**Кому:** владельцы компании (`notifications:company:{id}:owners`)

**Пороги:** за **7**, **3** и **1** день до `company.subscription_end_date`.

| Дней до конца | level     |
| ------------- | --------- |
| 7             | `info`    |
| 3             | `warning` |
| 1             | `error`   |
| 0 (сегодня)   | `error`   |

```json
{
  "type": "notification",
  "data": {
    "type": "tariff.expiring",
    "category": "tariff",
    "level": "warning",
    "title": "Тариф заканчивается через 3 дня",
    "message": "Продлите подписку, чтобы сохранить доступ ко всем функциям NurCRM.",
    "url": "/crm/additional-services",
    "cta_label": "Продлить",
    "meta": {
      "source_kind": "tariff",
      "source_id": "company-uuid-3d",
      "days_left": 3
    }
  }
}
```

**Dedupe:** один push per `(company_id, days_left)` — ключ `source_id = f"{company_id}-{days_left}d"`.

> FE сейчас дублирует тариф **локально** (`buildTariffLocalNotification`). После реализации WS-тарифа локальный fallback можно оставить как подстраховку.

---

### 6.6. POS / Касса (P0)

#### `market.sale.created`

**Когда:** checkout завершён (POS / sell).  
**Кому:** `notifications:cashbox:{cashbox_id}` + `notifications:company:{company_id}`

```json
{
  "type": "market.sale.created",
  "level": "info",
  "title": "Новая продажа",
  "message": "Касса «Основная»: 1 250,00 сом",
  "url": "/crm/market/cashier",
  "meta": {
    "source_kind": "pos_sale",
    "source_id": "sale-uuid",
    "cashbox_id": "..."
  }
}
```

#### `market.payment.received`

**Когда:** оплата подтверждена (в т.ч. split payment).

#### `market.cashflow.created` / `market.cashflow.pending`

**Когда:** auto-cashflow создан (см. [auto-cashflows-backend.md](./auto-cashflows-backend.md)).

- `created` → level `success`
- `pending` → level `warning`, url `/crm/pending`

---

### 6.7. Смены (P1)

| Тип                   | Когда          | level  |
| --------------------- | -------------- | ------ |
| `market.shift.opened` | Открытие смены | `info` |
| `market.shift.closed` | Закрытие смены | `info` |

**Кому:** `notifications:cashbox:{id}` + owners (при расхождении `cash_diff != 0` → level `warning`).

---

### 6.8. Долги (P1)

| Тип                   | Когда        | level     |
| --------------------- | ------------ | --------- |
| `market.debt.created` | Создан долг  | `info`    |
| `market.debt.paid`    | Погашение    | `success` |
| `market.debt.overdue` | Cron nightly | `warning` |

---

### 6.9. Матрица «событие → группы WS»

| event_type                      | WS-группы                               | recipient (БД)            |
| ------------------------------- | --------------------------------------- | ------------------------- |
| `market.sale.created`           | `cashbox:{id}`, `company:{id}`          | — (broadcast) или кассиры |
| `market.cashflow.pending`       | `cashbox:{id}`, `company:{id}:owners`   | owners                    |
| `market.transfer.received`      | `notif_user:{recipient}`                | получатель                |
| `market.product.status_changed` | `notif_user:{initiator}`                | инициатор                 |
| `market.product.written_off`    | `warehouse:{id}`, `notif_user:{author}` | автор                     |
| `market.stock.low`              | `notif_user:{each manager}`             | каждый менеджер           |
| `market.shift.closed`           | `cashbox:{id}`, `company:{id}:owners`   | —                         |
| `tariff.expiring`               | `company:{id}:owners`                   | каждый owner              |
| `market.debt.overdue`           | `company:{id}:owners`                   | owners                    |

---

## 7. Cron и фоновые задачи

### 7.1. `send_tariff_notifications`

```python
@shared_task
def send_tariff_notifications():
    today = timezone.localdate()
    for company in Company.objects.filter(is_active=True):
        days_left = (company.subscription_end_date - today).days
        if days_left in (7, 3, 1, 0):
            for owner in company.owners:
                create_and_publish_notification(
                    company_id=company.id,
                    recipient_id=owner.id,
                    event_type="tariff.expiring",
                    category="tariff",
                    level=_tariff_level(days_left),
                    title=_tariff_title(days_left),
                    message="Продлите подписку...",
                    url="/crm/additional-services",
                    cta_label="Продлить",
                    meta={
                        "source_kind": "tariff",
                        "source_id": f"{company.id}-{days_left}d",
                        "days_left": days_left,
                    },
                    ws_groups=[f"notifications:company:{company.id}:owners"],
                )
```

### 7.2. `send_debt_overdue_notifications` (P1)

Nightly: долги с просроченным графиком → `market.debt.overdue`.

### 7.3. `check_stock_thresholds` (P2)

Если остаток < порога в настройках склада → `market.stock.low` (отдельно от StockShortageEvent).

---

## 8. Идемпотентность и dedupe

### 8.1. Правило

При повторном вызове с тем же `(company_id, event_type, meta.source_id)`:

1. **Не создавать** новую запись в БД
2. **Не отправлять** повторный WS

### 8.2. Реализация

```python
def find_duplicate(company_id, event_type, source_id) -> Notification | None:
    if not source_id:
        return None
    return Notification.objects.filter(
        company_id=company_id,
        type=event_type,
        meta__source_id=str(source_id),
    ).first()
```

### 8.3. Исключения (можно дублировать)

- `lead.message` / консалтинг — каждое сообщение уникально
- `market.stock.low` — новая нехватка = новый `source_id` (id события)

---

## 9. Приоритеты реализации (P0 → P2)

### P0 — минимум для prod Market

- [ ] `create_and_publish_notification` + `transaction.on_commit`
- [ ] WS-группы: `notif_user_{id}`, `notifications:company:{id}`, `notifications:cashbox:{id}`
- [ ] `unread_count` в `GET /notifications/` + WS после read/mark-all
- [ ] `market.sale.created` после checkout
- [ ] `market.cashflow.created` / `market.cashflow.pending` (auto-cashflows)
- [ ] `market.transfer.received` (Subreal)
- [ ] `market.product.status_changed` (return/defect approve/reject)

### P1 — склад, долги, смены

- [ ] `market.product.received`, `market.product.written_off`, `market.supplier.return`
- [ ] `market.debt.created`, `market.debt.paid`, `market.debt.overdue` (cron)
- [ ] `market.shift.opened`, `market.shift.closed`

### P2 — дополнительно

- [ ] `market.stock.low` (StockShortageEvent + пороги)
- [ ] `tariff.expiring` через WS (заменить FE fallback)
- [ ] `DELETE /notifications/{id}/`
- [ ] i18n `title`/`message` (ru/ky) — поле `locale` в meta

---

## 10. Тестирование и QA

### 10.1. Unit-тесты (Django)

```python
@pytest.mark.django_db
def test_sale_creates_notification_and_ws(group_send_mock):
    complete_checkout(sale)
    assert Notification.objects.filter(type="market.sale.created").count() == 1
    group_send_mock.assert_called()
    payload = group_send_mock.call_args[1]["payload"]
    assert payload["type"] == "notification"
    assert payload["data"]["is_read"] is False

def test_dedupe_skips_second_publish():
    publish(..., source_id="same-id")
    publish(..., source_id="same-id")
    assert Notification.objects.count() == 1
```

### 10.2. Ручная проверка WS

```bash
websocat "wss://stageapp.nurcrm.kg/ws/notifications/?token=ACCESS_TOKEN"
```

1. Открыть WS от пользователя A
2. Пользователем B выполнить checkout / передачу партии
3. Ожидание у A:
   - JSON `{ "type": "notification", "data": { ... } }`
   - Toast на экране FE
   - Badge колокольчика +1
   - Звук (если вкладка активна)

### 10.3. REST

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://stageapp.nurcrm.kg/api/main/notifications/?limit=20"

# unread_count в ответе обязателен

curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://stageapp.nurcrm.kg/api/main/notifications/{id}/read/"
# → WS unread_count уменьшился
```

### 10.4. Contract checklist

| Проверка                                                       | OK  |
| -------------------------------------------------------------- | --- |
| Каждый `market.*` → запись в БД + WS                           | ☐   |
| Payload содержит `id`, `title`, `is_read: false`, `created_at` | ☐   |
| Dedupe при retry                                               | ☐   |
| `unread_count` монотонен                                       | ☐   |
| POST (не PATCH) для read                                       | ☐   |
| Путь `mark-all-read/`                                          | ☐   |
| Close 4401 при expired token                                   | ☐   |

---

## 11. Чеклист перед выкатом

### Backend

- [ ] Миграции `Notification` (поля `type`, `level`, `meta`, индексы)
- [ ] Consumer подписывает user на все нужные группы
- [ ] Все P0 signals подключены
- [ ] Celery beat: `send_tariff_notifications`
- [ ] Staging: contract tests green

### Frontend (уже готово, проверить после BE)

- [ ] Toast появляется при WS-событии
- [ ] Badge совпадает с `unread_count` после refresh
- [ ] Клик по уведомлению → navigate по `url`
- [ ] Mark read уменьшает badge

### FE follow-up (опционально, после `market.transfer.received`)

Добавить в `src/shared/lib/notifications/realtimeEvents.ts`:

```typescript
TRANSFER_RECEIVED: "market.transfer.received",
```

---

## Приложение A: маппинг `level` → toast (FE)

| `level` (BE)                            | Toast (FE)   |
| --------------------------------------- | ------------ |
| `success`, `ok`                         | зелёный      |
| `warning`, `warn`, `medium`             | жёлтый       |
| `error`, `danger`, `critical`, `urgent` | красный      |
| иное                                    | синий (info) |

---

## Приложение B: ссылки

| Документ                                                                           | Тема                    |
| ---------------------------------------------------------------------------------- | ----------------------- |
| [realtime-notifications-backend.md](./realtime-notifications-backend.md)           | Краткий контракт FE     |
| [auto-cashflows-backend.md](./auto-cashflows-backend.md)                           | Cashflow → notification |
| [procurement-history-returns-backend.md](./procurement-history-returns-backend.md) | Return flow             |
| [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md)                                 | Клиентский QA staging   |
