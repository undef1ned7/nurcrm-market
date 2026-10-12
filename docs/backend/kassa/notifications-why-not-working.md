# Уведомления: почему до сих пор ничего не приходит с бэка

**Фронт:** `nur-market` (готов, см. ниже) · **Бэкенд:** NurCRM API
**Статус:** ✅ **закрыто, 2026-09-23** — бэк публикует 9 подтверждённых типов событий (контракт из этого документа/`notifications-backend-implementation.md` поддержан), включая срок годности и тариф по cron. Фронт снял клиентские fallback'ы (`buildProductExpiryLocalNotification`, `buildTariffLocalNotification` — были вызваны из `src/widgets/notification-modal/ui/NotificationModal.tsx`, теперь не используются, компонент отдаёт только список с бэка). В enum событий (`src/shared/lib/notifications/realtimeEvents.ts`) добавлен `market.transfer.received`. Остаток диагноза ниже — исторический контекст, зачем всё это понадобилось.
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Читать вместе с (там же — весь код и контракт, этот файл — только диагноз):
[notifications-backend-implementation.md](./notifications-backend-implementation.md) (полное ТЗ, модели, WS-consumer, сервис публикации, сигналы),
[realtime-notifications-backend.md](./realtime-notifications-backend.md) (краткий контракт),
[../product-expiry-tracking-backend.md](../product-expiry-tracking-backend.md) (срок годности отдельно).

---

## 1. Короткий ответ

Уведомление о сроке годности — единственное, что «работает», **потому что оно не приходит с бэка вообще**. Фронт при открытии списка товаров сам сравнивает `product.expiration_date` с сегодняшней датой и рисует один сводный пункт в колокольчике (`src/entities/product/lib/productExpiry.ts:112-189`, функция `buildProductExpiryLocalNotification`). Это клиентский костыль на время, пока бэк не прислал реальный push — см. комментарий в коде на строке 115.

Всё остальное — 8+ типов событий (продажа, приход, долг, смена, нехватка на складе, тариф и т.д.), которые фронт уже умеет принимать и показывать (`src/shared/lib/notifications/realtimeEvents.ts:14-34`) — **никогда не приходило**, потому что на бэке нет ни одного места, которое их публикует.

Ниже — по каждому каналу, что именно отсутствует или не подтверждено.

---

## 2. WebSocket `/ws/notifications/`

Фронт подключается на `wss://{host}/ws/notifications/?token={access_token}` и ждёт сообщения вида `{ "type": "notification", "data": {...} }` (`src/entities/notification/lib/useNotificationsSocket.tsx:262-274`).

**Нужно подтвердить / скорее всего отсутствует:**

- [ ] Существует ли consumer на `/ws/notifications/` вообще, или соединение падает / не аутентифицируется?
- [ ] Есть ли WS-группы `notifications:company:{id}`, `notifications:company:{id}:owners`, `notifications:cashbox:{id}`, `notifications:warehouse:{id}`, `notif_user_{id}` — и подписывается ли пользователь на них при `connect()`?
- [ ] Есть ли **хотя бы одно место в коде**, которое вызывает `group_send(...)` с `type: "notification"` после бизнес-события (продажа, приход, оплата и т.д.)? Судя по поведению — нет ни одного.
- [ ] Отдаёт ли consumer `unread_count` после создания уведомления / после `mark read`?

Быстрая ручная проверка (сделать на staging самим бэком, не через фронт):

```bash
websocat "wss://stageapp.nurcrm.kg/ws/notifications/?token=ACCESS_TOKEN"
```

Если после этого сделать продажу в POS от другого пользователя той же компании и в сокете **ничего не пришло** — значит подтверждён факт: события нигде не публикуются. Это и есть корень проблемы.

---

## 3. REST `GET /main/notifications/`

Фронт ожидает `{ count, unread_count, results: [...] }` (`notificationSlice.ts:88-119`). Если эндпоинт:

- отдаёт пустой список — значит в БД действительно нет записей `Notification`, кроме, возможно, старых legacy-типов;
- не отдаёт `unread_count` — бейдж на колокольчике при перезагрузке страницы будет 0 даже если что-то есть в БД.

**Нужно подтвердить:**

- [ ] `unread_count` присутствует в ответе
- [ ] `POST /main/notifications/{id}/read/` существует (не `PATCH` — фронт зовёт именно `POST`)
- [ ] `POST /main/notifications/mark-all-read/` существует по этому точному пути (не `mark-all-as-read/`)

---

## 4. Публикация событий (сердце проблемы)

В [notifications-backend-implementation.md §4](./notifications-backend-implementation.md#4-сервис-публикации-create_and_publish_notification) описан сервис `create_and_publish_notification` и таблица «где вызывать» (§4.4) — checkout, оплата, приход, списание, долг, смена, нехватка на складе, тариф. По факту, судя по тому, что доходит до фронта только локальный расчёт по сроку годности, **ни один из этих вызовов не подключён**: ни в одном из `SaleService`, `CashflowService`, `DebtService`, `ShiftService` нет сигнала, создающего `Notification` и публикующего его в WS-группу.

Это не вопрос доработки одного эндпоинта — это означает, что модуль уведомлений на бэке либо не начинался, либо есть только модель/эндпоинты CRUD без единой точки публикации, вызываемой из бизнес-логики.

---

## 5. Срок годности отдельно: `market.product.expiring`

Даже этот единственный «работающий» тип на самом деле не реализован на бэке:

- [ ] `expiration_date` не подтверждено, что сохраняется в `Product` (форма шлёт поле, но неизвестно, принимает ли бэк его или молча игнорирует как неизвестный ключ) — см. [product-expiry-tracking-backend.md §2](../product-expiry-tracking-backend.md#2-модель-поле-expiration_date)
- [ ] нет ночного cron, который считает истекающие товары по компании и публикует агрегированный digest `market.product.expiring` — см. [product-expiry-tracking-backend.md §5](../product-expiry-tracking-backend.md#5-real-time-уведомление-marketproductexpiring)
- [ ] нет `expiring_products_count` / `tables.expiring_products[]` в аналитике

Полное ТЗ с порогами, payload и идемпотентностью — там же.

---

## 6. Что нужно сделать бэку, чтобы уведомления вообще заработали (минимум)

Порядок — от «сначала докажите, что канал жив» до «подключите реальные события»:

1. **Проверить/поднять WS consumer** на `/ws/notifications/` с аутентификацией по JWT и подпиской на группы (`notifications-backend-implementation.md §3.2`).
2. **Добавить `unread_count`** в `GET /main/notifications/` и WS-событие `{"type": "unread_count", "count": N}` после read/mark-all.
3. **Реализовать `create_and_publish_notification`** ровно по сигнатуре из §4.1 — единая точка входа, вызываемая из бизнес-кода.
4. **Подключить P0-события** из чеклиста в [realtime-notifications-backend.md](./realtime-notifications-backend.md#чеклист-реализации-для-бэкенда): `market.sale.created`, `market.cashflow.pending/created`, `market.transfer.received`, `market.product.status_changed`.
5. **Cron `send_tariff_notifications`** и **cron срока годности** (`market.product.expiring`) — оба уже расписаны с кодом-псевдонимом в соответствующих файлах.
6. Прогнать чеклист из §10.4 `notifications-backend-implementation.md` (dedupe, `unread_count` монотонен, POST не PATCH, путь `mark-all-read/`, close-код 4401).

Фронт весь этот контракт уже поддерживает и ничего дорабатывать не должен — см. таблицу «Frontend (уже готово, проверить после BE)» в §11 того же документа.

---

## 7. Как понять, что починили (definition of done)

- Продажа в POS от пользователя A → у пользователя B (той же компании/кассы) в течение 1-2 секунд: WS-сообщение, toast на экране, +1 на бейдже колокольчика — **без обновления страницы**.
- После перезагрузки страницы бейдж колокольчика совпадает с `unread_count` из REST.
- В колокольчике, помимо локального пункта про срок годности, появляются серверные уведомления с реальным `id` (UUID, не синтетический `ws-...`).

---

## История

| Дата | Автор | Изменение |
|------|-------|-----------|
| 2026-09-23 | BE | 9 типов событий подтверждены и реально публикуются; cron для срока годности и тарифа работает |
| 2026-09-23 | nur-market (FE) | Клиентские fallback'ы (срок годности, тариф) в `NotificationModal.tsx` отключены — источник теперь только бэк; `market.transfer.received` добавлен в `realtimeEvents.ts` |
