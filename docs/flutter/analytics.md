# Flutter: аналитика и отчёты

Экран `/crm/market/analytics` на вебе. Один эндпоинт с вкладками (`tab=`) — карточки/графики/таблицы.

**Бэкенд-док:** [analytics.md](../backend/analytics.md) (статус на момент написания: ⚠️ фильтрация по времени суток не работала, по дате — с погрешностью на границах суток; сверять на стенде перед релизом Flutter-версии).

**Отчёты по конкретной кассе (не общая аналитика)** — отдельный контракт: [cashbox-reports.md](./cashbox-reports.md).

---

## Содержание

1. [Эндпоинт и период](#1-эндпоинт-и-период)
2. [Общие параметры](#2-общие-параметры)
3. [Вкладки: параметры и ответ](#3-вкладки-параметры-и-ответ)
4. [Список транзакций (модалка)](#4-список-транзакций-модалка)
5. [Известные риски](#5-известные-риски)
6. [Чеклист Flutter](#6-чеклист-flutter)

---

## 1. Эндпоинт и период

```http
GET /main/analytics/market/?tab=sales&period_start=2026-07-09T09:30:00&period_end=2026-07-09T18:00:59
```

Правила периода:

- `period_start`/`period_end` — **местное время компании (Asia/Bishkek, UTC+6)**, формат `YYYY-MM-DDTHH:MM:SS`, **без** таймзоны в строке и **без** конвертации в UTC на клиенте.
- Границы **включительные** с обеих сторон.
- Обратная совместимость: формат-без-времени `YYYY-MM-DD` тоже принимается — трактуется как `00:00:00`..`23:59:59` этого дня.
- Все агрегации по часам/дням/дням недели считаются по местному времени, не UTC.
- Невалидный период → `400` с `detail`, не пустой ответ и не 500.

```dart
String formatPeriod(DateTime localDateTime) =>
    DateFormat("yyyy-MM-dd'T'HH:mm:ss").format(localDateTime); // без .toUtc()!
```

**Не вызывать `.toUtc()` перед отправкой** — сервер ожидает уже локальное представление как есть.

---

## 2. Общие параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `tab` | string | `sales \| stock \| purchases \| cashboxes \| shifts \| products \| suppliers \| users \| finance \| salary` |
| `period_start` / `period_end` | datetime/date | см. §1 |
| `branch` | uuid | только owner/admin |
| `include_global` | `"1"` | вместе с `branch` — включить записи без филиала |
| `limit` | int | ограничение размера таблиц |

Маппинг названий вкладок веб-UI → API: `warehouse → stock`, `cashiers → cashboxes`, остальные 1:1.

Доп. параметры по вкладкам:

| Вкладки | Параметры |
|---------|-----------|
| `sales`, `cashboxes`, `suppliers`, `purchases` | `cashbox`, `shift`, `cashier` (uuid), `payment_method` (`cash`/`transfer`), `min_total`, `max_total` |
| `suppliers`, `purchases` | + `purchase_date_from`, `purchase_date_to` (`YYYY-MM-DD`) |
| `stock` | `product`, `category`, `kind`, `low_only=1` |
| `shifts` | `status`, `cashbox`, `cashier` |

«Финансы» — **два** отдельных запроса: `tab=finance` и `tab=salary` (из `salary` читается только `rows`).

---

## 3. Вкладки: параметры и ответ

Общая форма ответа: `{ "cards": {...}, "charts": {...}, "tables": {...} }`.

### `tab=sales`
- `cards`: `revenue`, `transactions`, `avg_check`, `clients`; для модалки «Выручка»: `cogs`, `gross_profit`, `margin_percent`, `cogs_warning`
- `charts`: `sales_dynamics[{date, value}]`, `payment_methods[{method, total|count}]`
- `tables`: `top_products[{name, sold, revenue}]`, `documents[{name, count, sum, stock}]`

### `tab=stock`
- `cards`: `total_products`, `categories_count|categories`, `inventory_value`, `total_stock_quantity|total_units`, `zero_stock_products_count|zero_stock_count|out_of_stock_count`
- `charts`: `category_distribution`, `movement_units|movement` (движение — за период, остальное — на текущий момент)
- `tables`: `products_stock|low_stock`

### `tab=cashboxes`
- `cards`: `revenue`, `transactions`, `avg_check`, `cash_in_box`, `cash_share_percent`
- `charts`: `sales_by_hours[{hour, revenue}]` (час местный), `payment_methods[{name, percent}]`, `transactions_by_weekday[{weekday, transactions}]` (`0` = понедельник, местное время)
- `tables`: `payment_detail[{method, transactions, sum, share}]`, `peak_hours[{hour, transactions, revenue, avg_check}]`

### `tab=shifts`
- `cards`: `active_shifts`, `shifts_today`, `avg_duration_hours`, `avg_revenue_per_shift`
- `charts`: `sales_by_shift_bucket`
- `tables`: `active_shifts`, `best_cashiers`

### `tab=products`
- `cards`: `catalog_products_count`, `stock_value`, `low_stock_count`, `rejected_products_count`, `sales_lines_missing_product_count`
- `tables`: `top_by_revenue`, `top_by_quantity`, `categories`, `brands`, `low_stock_products`

### `tab=suppliers`
- `cards`: `suppliers_count`, `total_stock_value`, `total_period_qty_sold`, `total_period_revenue`
- `tables`: `suppliers`, `suppliers_by_stock`

### `tab=purchases`
- `cards`: `purchased_sku_count`, `purchased_units`, `purchased_value`
- `tables`: `by_supplier`

### `tab=users`
- `cards`: `total`, `closed`, `open`, `discrepancies_count`
- `tables`: `users_performance`, `shift_discrepancies`

### `tab=finance`
- `cards`: `income_total`, `expense_total`, `net_flow`, `income_count`, `expense_count`
- `tables`: `expense_breakdown`, `income_breakdown`, `expense_items`, `income_items`

### `tab=salary`
- `rows[]` — по сотрудникам за период (только это поле нужно читать).

Поле времени по сущности при агрегации (важно для собственных клиентских перерасчётов/кэша):

| Сущность | Поле времени |
|----------|--------------|
| Продажа (чек) | `paid_at`, fallback `created_at` |
| Строка продажи | время родительского чека |
| Закупка/приход | дата-время документа |
| Смена | пересечение с периодом: `opened_at <= period_end AND (closed_at >= period_start OR closed_at IS NULL)` |
| Операция ДДС (finance) | дата-время операции |
| Зарплата | период начисления/выплаты |
| Склад (`stock`) | остатки — на текущий момент; `movement` — за период |

---

## 4. Список транзакций (модалка)

```http
GET /main/pos/sales/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&payment_method=&cashbox=&cashier=&min_total=&max_total=
```

На момент документации сервер надёжно принимает только `YYYY-MM-DD` (без времени) для этого эндпоинта — если нужна точная отсечка по времени суток, доотфильтровать на клиенте после получения списка (страховка, не полагаться только на сервер).

---

## 5. Известные риски

- **Время суток игнорировалось** (`period_start`/`period_end` с `HH:MM:SS`) — сервер отдавал данные за весь день независимо от точного интервала. Проверить на актуальном стенде перед тем, как полагаться на точную фильтрацию.
- **UTC vs местное время на границах суток** — продажи около полуночи могли попадать не в тот день (сдвиг ±6 часов). Симптом: продажа в `23:30` локального времени учитывается в аналитике за следующий UTC-день.
- Несогласованность карточек и графиков одной вкладки при интервальной фильтрации (карточка считалась за весь день, график — за интервал) — если наблюдается, значит фильтр по времени всё ещё не применяется единообразно.
- Проверочный набор данных для регрессионного теста (3 продажи в один день: 08:00, 12:00, 20:00 местного, по 1000 сом): период `09:00:00–18:00:59` должен дать `revenue=1000, transactions=1` (только продажа в 12:00). Если возвращает больше — баг ещё не пофикшен.

---

## 6. Чеклист Flutter

- [ ] Период всегда local time, без `.toUtc()`; формат `YYYY-MM-DDTHH:MM:SS`
- [ ] Fallback на `YYYY-MM-DD` там, где точность до минуты не нужна (день/неделя целиком)
- [ ] Маппинг вкладок веб-терминов (`warehouse`→`stock`, `cashiers`→`cashboxes`) не переносить буквально в Flutter UI-labels, только в query
- [ ] «Финансы» — два отдельных запроса (`finance` + `salary`), не один
- [ ] Перед релизом — smoke-тест на регрессионном наборе из §5 (3 продажи в разное время суток одного дня)
- [ ] Список транзакций модалки — доп. клиентская отсечка по времени как страховка, пока сервер надёжно фильтрует только по дате
- [ ] `branch`/`include_global` — только для owner/admin, скрывать выбор филиала для остальных ролей

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [cashbox-reports.md](./cashbox-reports.md) | Отчёты конкретной кассы (день/месяц) |
| [products-catalog.md](./products-catalog.md) | Каталог и фильтры склада (для tab=stock/products) |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Смены, кассы (для tab=shifts/cashboxes/finance) |
| [auth-and-api-basics.md](./auth-and-api-basics.md) | Базовая настройка, таймзона, права по ролям |
