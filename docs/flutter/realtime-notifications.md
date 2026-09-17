# Flutter: real-time уведомления (WebSocket + REST)

Полный контракт событий — расширяет краткое описание в [tz-aug-2026.md §Модуль 2](./tz-aug-2026.md#модуль-2-уведомления) и раздел 16 [cash-and-cashflows.md](./cash-and-cashflows.md#16-real-time-уведомления).

**Подключение и auth над WS:** [auth-and-api-basics.md §5](./auth-and-api-basics.md#5-websocket-подключение).

**Бэкенд-доки:**
- [realtime-notifications-backend.md](../backend/kassa/realtime-notifications-backend.md)
- [notifications-backend-implementation.md](../backend/kassa/notifications-backend-implementation.md)

---

## 1. REST API

```http
GET  /main/notifications/?limit=&offset=&is_read=&category=
POST /main/notifications/{id}/read/
POST /main/notifications/mark-all-read/        // опц. ?category=
DELETE /main/notifications/{id}/
```

`POST .../read/` — именно **POST**, не PATCH (осознанный выбор контракта). `mark-all-read`, не `mark-all-as-read`.

Ответ списка:

```json
{
  "count": 42,
  "unread_count": 5,
  "results": [ { "id": "uuid", "title": "...", "message": "...", "category": "tariff", "is_read": false, "created_at": "..." } ]
}
```

`unread_count` — обязательное поле, читать его при холодном старте для бейджа (до первого WS-события).

### 1.1 Модель уведомления

| Поле | Тип | Обяз. |
|------|-----|-------|
| `id` | uuid | да |
| `category` | `tariff` \| `system` \| `news` \| `other` | да |
| `title` | string | да |
| `message` (алиас `body`) | string | да |
| `is_read` | bool | да |
| `created_at` | datetime | да |
| `url` (алиас `cta_url`) | string | нет |
| `cta_label` | string | нет |
| `meta` | object | нет — контекст события, см. §3 |
| `level` | string | нет — влияет на цвет тоста |

Легаси-алиасы `type`/`kind` (`subscription`, `maintenance`, `promo`) — маппить в `category` (см. веб `notificationCategory.ts`).

`level` → цвет UI:

| `level` | Цвет |
|---------|------|
| `success`, `ok` | зелёный |
| `warning`, `warn`, `medium` | жёлтый |
| `error`, `danger`, `critical`, `urgent` | красный |
| остальное / отсутствует | синий (info) |

---

## 2. WebSocket: конверт сообщения

```
wss://{host}/ws/notifications/?token={accessToken}
```

Единый конверт для push-уведомлений:

```json
{
  "type": "notification",
  "data": {
    "id": "uuid",
    "title": "Движение по кассе",
    "message": "Касса «Касса филиала 1»: +1 500,00 сом",
    "category": "system",
    "type": "market.cashflow.created",
    "level": "success",
    "is_read": false,
    "created_at": "2026-09-11T14:03:00+06:00",
    "url": null,
    "cta_label": null,
    "meta": {
      "cashflow_id": "uuid",
      "cashbox_id": "uuid",
      "source_kind": "pos_sale",
      "amount": "1500.00",
      "type": "income"
    }
  }
}
```

Обработка на клиенте: показать toast с `level`-цветом, инкрементировать/обновить badge, при желании — обновить локальный кэш соответствующей сущности (кассы, смены, товара) по `meta`, не дожидаясь ручного refresh экрана.

Служебные (не показывать как toast):

```json
{ "type": "connection_established" }
{ "type": "pong" }
{ "type": "unread_count", "count": 7 }
```

---

## 3. Каталог событий `market.*`

Стабильный, не локализованный enum в `data.type` (или `meta.event`, см. конкретный бэкенд-релиз — проверить оба поля при парсинге):

| Событие | Когда | Ключевые поля `meta` |
|---------|-------|------------------------|
| `market.sale.created` | Пробит чек POS | `sale_id`, `total`, `payment_method` |
| `market.payment.received` | Получен платёж (в т.ч. по долгу) | `amount`, `method`, `client_id?` |
| `market.cashflow.created` | Создана запись кассы (авто или ручная) | `cashflow_id`, `cashbox_id`, `source_kind`, `amount`, `type` |
| `market.cashflow.pending` | Запись создана в статусе `pending`, ждёт подтверждения | `cashflow_id`, `cashbox_id` |
| `market.product.received` | Приход товара на склад | `product_id`, `qty` |
| `market.product.status_changed` | Изменился статус товара | `product_id`, `status` |
| `market.product.written_off` | Списание (брак и т.п.) | `product_id`, `qty`, `reason` |
| `market.supplier.return` | Возврат поставщику проведён | `return_id`, `supplier_id` |
| `market.debt.created` | Создана сделка в долг | `deal_id`, `client_id`, `amount` |
| `market.debt.paid` | Долг (полностью/частично) оплачен | `deal_id`, `amount` |
| `market.debt.overdue` | Просрочка по долгу | `deal_id`, `client_id`, `days_overdue` |
| `market.shift.opened` | Открыта смена | `shift_id`, `cashbox_id` |
| `market.shift.closed` | Закрыта смена | `shift_id`, `cash_diff` |
| `market.shift.updated` | Живое обновление ящика смены (новая продажа/расход внутри открытой смены) | `shift_id`, `drawer_expected_cash` |
| `market.stock.low` | Остаток товара ниже минимума | `product_id`, `current_qty`, `minimum_quantity` |
| `market.transfer.received` | Получен перевод/трансфер между филиалами | `transfer_id` |
| `tariff.expiring` | Тариф истекает через 7/3/1 дней | `days_left` |
| `system.notification` | Системное сообщение общего вида | — |

Клиент **не фильтрует** события по роли — сервер решает, кому их отправлять (группы ниже), поэтому если событие пришло — его можно показывать.

### 3.1 Использование для live-обновления UI

- `market.cashflow.created` / `market.cashflow.pending` → обновить список cashflows на экране кассы без polling.
- `market.shift.updated` → обновить `drawer_expected_cash` на экране кассира в реальном времени (несколько устройств на одной смене).
- `market.stock.low` → тост + бейдж на разделе склад.
- `tariff.expiring` → баннер продления, дублирует локальный расчёт по `subscription_end_date` (см. [auth-and-api-basics.md](./auth-and-api-basics.md)), но не заменяет его, пока бэк не гарантирует доставку всех дней (7/3/1).

---

## 4. Группы рассылки (для понимания, что и кому придёт)

Backend (Django Channels) рассылает по группам, клиент их не выбирает:

- `notif_user_{user_id}` — персональные
- `notifications:company:{id}` — все сотрудники компании
- `notifications:company:{id}:owners` — только владельцы/админы (например approve-required события)
- `notifications:cashbox:{id}` — те, кто смотрит конкретную кассу
- `notifications:warehouse:{id}` — по конкретному складу/филиалу

Т.е. один и тот же `market.cashflow.pending` дойдёт до owner-группы, даже если кассир, создавший операцию, её не увидит (или увидит без CTA «подтвердить»).

---

## 5. Дедупликация

Ключ дедупа: `(company_id, event_type, meta.source_id)`. Повторная публикация того же события — no-op: не создаётся вторая запись в БД, не отправляется второй WS-пуш. Клиенту не нужно самому фильтровать дубли по этому ключу, но **UI должен быть идемпотентным** к повторной доставке того же `id` (например, при переподключении WS может прийти уже показанное уведомление из REST-догрузки) — использовать `id` как ключ списка, не `insert` вслепую.

---

## 6. Ошибки соединения

| Close code | Причина | Действие клиента |
|------------|---------|-------------------|
| `4401` | Токен истёк/невалиден | Refresh access token → переподключиться с новым `token` |
| прочие / сетевой обрыв | — | Backoff-реконнект (см. [auth-and-api-basics.md §5](./auth-and-api-basics.md#5-websocket-подключение)) |

---

## 7. Чеклист Flutter

- [ ] REST: список + `unread_count` при холодном старте, до открытия WS
- [ ] WS: ping/pong 25с, backoff-реконнект, спец-обработка 4401
- [ ] Единый конверт `{"type":"notification","data":{...}}`, служебные типы не показывать как toast
- [ ] `level` → цвет тоста; `category` → вкладки/фильтр
- [ ] Полный каталог `market.*` событий не жёстко зашит одним switch без default — неизвестный тип должен деградировать в generic toast, а не падать
- [ ] Список уведомлений идемпотентен к повтору по `id` (WS + REST могут пересекаться)
- [ ] `market.shift.updated` используется для live-сверки ящика на кассире
- [ ] `POST .../read/` (не PATCH), `mark-all-read` (не `mark-all-as-read`)

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [auth-and-api-basics.md](./auth-and-api-basics.md) | Подключение WS, auth, базовые URL |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | События по деньгам в контексте кассы/смен |
| [tz-aug-2026.md](./tz-aug-2026.md) | Категории уведомлений, CTA, тарифные алерты |
