# Маркет — Рекомендуемый заказ: ТЗ для бэкенда

**Страница:** `/crm/market/procurement/recommendations`  
**Фронт:** `src/features/procurement-recommendations/`  
**Эндпоинт:** `GET /main/suppliers/{supplier_id}/recommendations/`  
**Статус:** фронт готов; бэкенд отсутствует. При `404`/`405` фронт временно собирает каталог поставщика из `GET /main/suppliers/{id}/products/` и считает рекомендацию на клиенте (продажи в этом режиме смоделированы).

Связанные существующие эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `GET` | `/main/clients/?type=suppliers` | список поставщиков |
| `GET` | `/main/suppliers/{id}/products/` | товары поставщика + остаток |
| `POST` | `/main/suppliers/{id}/receipt/` | создание прихода |
| `GET` | `/main/suppliers/receipts/` | история приходов |
| `GET` | `/main/products/{id}/purchase-batches/` | партии закупки по товару (N+1, не использовать в этом API) |
| `GET` | `/main/pos/sales/` | продажи POS |
| `POST` | `/main/pos/sales/{id}/return/` | возврат продажи |

---

## Purpose

Администратор магазина выбирает поставщика и получает **одним запросом** таблицу:

- какие товары этого поставщика заканчиваются;
- остаток, продажи, скорость продаж, запас в днях;
- дата/количество/цена последней закупки;
- сколько рекомендуется заказать.

Система **не создаёт приход**. Она только отдаёт аналитику. Пользователь правит колонку «Заказать» и переходит в существующий flow `POST /main/suppliers/{id}/receipt/`.

Новый сотрудник должен сделать адекватную закупку без опыта. Формула должна быть прозрачной, без ML.

---

## Endpoint

```http
GET /main/suppliers/{supplier_id}/recommendations/
Authorization: Bearer <access_token>
```

Почему этот path:

- закупки маркета уже живут в `/main/suppliers/…`, а не в `/warehouse/…` и не в `/api/v1/…`;
- рядом уже есть `/products/`, `/purchases/`, `/receipt/`;
- `supplier_id` — обязательный контекст экрана, логично держать его в URL.

Допустимый алиас (если удобнее коллекция):

```http
GET /main/procurement-recommendations/?supplier_id=<uuid>
```

Фронт сейчас вызывает **первый** вариант. Если выберете алиас — напишите, путь на фронте меняется в одном месте: `RECOMMENDATIONS_API_PATH`.

Не использовать `/api/v1`.

---

## Query params

Фронт сейчас передаёт:

| Параметр | Тип | Обяз. | Значения / default | Зачем |
|---|---|---|---|---|
| `analysis_days` | int | нет | `7 \| 14 \| 30`, default `30` | окно расчёта средней продажи/день |
| `coverage_days` | int | нет | `3 \| 7 \| 14`, default `7` | на сколько дней закрыть спрос до следующей закупки |
| `safety_days` | int | нет | `0 \| 1 \| 2 \| 3`, default `2` | страховой запас |
| `branch_id` | uuid | нет | филиал профиля, если есть | сузить остатки и продажи |
| `warehouse_id` | uuid | нет | сейчас фронт **не шлёт**, зарезервировано | сузить склад, если в модели есть |
| `page_size` | int | нет | фронт шлёт `500` | лимит строк |
| `page` | int | нет | default `1` | пагинация |

Рекомендуется также принять (фронт начнёт слать после появления API, сейчас фильтрует на клиенте):

| Параметр | Тип | Описание |
|---|---|---|
| `search` | string | имя / barcode / article / code |
| `only_required` | `true`/`1` | только `recommended_quantity > 0` |
| `stock_status` | `critical \| ending \| low \| ok` | фильтр по статусу остатка |

`coverage_days` и `safety_days` нужны бэкенду, чтобы посчитать `recommended_quantity` и `summary`. Фронт **всё равно пересчитывает** рекомендацию локально при смене настроек, опираясь на окна продаж 7/14/30. Поэтому в ответе обязательны сырые продажи, а не только итоговая рекомендация.

---

## Response

`200 OK`

```json
{
  "supplier": {
    "id": "15",
    "name": "Белая река"
  },
  "settings": {
    "analysis_days": 30,
    "coverage_days": 7,
    "safety_days": 2
  },
  "summary": {
    "products_count": 42,
    "recommended_products_count": 13,
    "critical_products_count": 5,
    "estimated_total": 34500
  },
  "count": 42,
  "page": 1,
  "page_size": 500,
  "next": null,
  "previous": null,
  "results": [
    {
      "product_id": "123",
      "product_name": "Молоко 1 л",
      "barcode": "1234567890",
      "article": "MLK-1",
      "code": "A-01",
      "unit": "шт",
      "is_weight": false,
      "scale_type": "piece",
      "current_stock": 8,
      "purchase_price": 62,
      "pack_size": 10,
      "sales": {
        "last_7_days": 35,
        "last_14_days": 70,
        "last_30_days": 140,
        "previous_7_days": 28,
        "previous_14_days": 56,
        "previous_30_days": 112,
        "previous_period": 112,
        "average_per_day": 4.67,
        "trend_percent": 25
      },
      "stock_forecast": {
        "days_remaining": 1.71,
        "status": "critical"
      },
      "last_purchase": {
        "date": "2026-08-01T10:20:00+06:00",
        "quantity": 40,
        "purchase_price": 62
      },
      "recommended_quantity": 40
    }
  ]
}
```

### Что фронт реально читает

Парсер: `src/features/procurement-recommendations/api/mapRecommendationResponse.ts`.

Обязательно:

| JSON | Куда на фронте |
|---|---|
| `supplier.id`, `supplier.name` или `full_name` | шапка |
| `results[]` (алиас `items[]`) | таблица |
| `product_id` (алиасы `productId`, `id`) | ключ строки |
| `product_name` (алиасы `productName`, `name`) | название |
| `unit` | единица, fallback `шт` |
| `is_weight` / `scale_type` | весовой товар |
| `current_stock` (алиасы `currentStock`, `quantity`) | остаток |
| `sales.last_7_days` / `sales7d` | колонка «Продажи 7 дн.» |
| `sales.last_30_days` / `sales30d` | колонка «Продажи 30 дн.» |
| `sales.last_14_days` / `sales14d` | окно анализа 14 дн. |

Желательно:

| JSON | Зачем |
|---|---|
| `barcode`, `article`, `code` | поиск и подпись |
| `purchase_price` | предварительная сумма заказа |
| `pack_size` или `packages[].quantity_in_package` | округление до упаковки |
| `sales.previous_7_days` / `previous_14_days` / `previous_30_days` | тренд |
| `sales.previous_period` | fallback предыдущего окна (сейчас читается как previous 30д) |
| `last_purchase.date`, `quantity`/`qty`, `purchase_price` | колонка «Последняя закупка» |

Опционально (фронт считает сам, но полезно для других клиентов и сверки):

- `sales.average_per_day`
- `sales.trend_percent`
- `stock_forecast.days_remaining` (`null`, если нет продаж)
- `stock_forecast.status`: `critical | ending | low | ok`
- `recommended_quantity`
- `summary.*`

`estimated_total` в `summary` = сумма `recommended_quantity * purchase_price` по товарам, где цена известна. Если ни у одного товара нет закупочной цены — `null`, не `0`.

Пустой каталог поставщика: `results: []`, `count: 0`, HTTP 200 (не 404).

---

## Formula

Фронт считает так же (`src/features/procurement-recommendations/lib/recommendationMath.ts`). Бэкенд должен совпадать.

```text
sales_qty            = количество, проданное за analysis_days (см. «Что считать продажей»)
average_daily_sales  = sales_qty / analysis_days
days_of_stock        = current_stock / average_daily_sales   # null, если average_daily_sales <= 0
required_stock       = average_daily_sales × (coverage_days + safety_days)
raw_recommendation   = required_stock - current_stock
recommended_quantity = max(0, raw_recommendation)
```

Округление:

- **Штучный товар** (`is_weight != true` и `scale_type != "weight"`):
  - сначала `ceil(raw_recommendation)`;
  - если `pack_size > 1`: `ceil(raw_recommendation / pack_size) * pack_size`.
- **Весовой товар**: не `ceil` до целого. Округлить до 3 знаков после запятой. `pack_size` не применять.
- Отрицательные/мусорные `stock` и `sales` считать как `0`.
- `analysis_days <= 0` → `average_daily_sales = 0`.
- Нет продаж → `days_of_stock = null` (на UI «Нет продаж», не Infinity).
- `current_stock = 0` и есть продажи → рекомендация = полный `required_stock`.

Тренд:

```text
current  = продажи за последние analysis_days
previous = продажи за предыдущие analysis_days (окно той же длины сразу до current)

если previous = 0 и current = 0 → trend_percent = 0
если previous = 0 и current > 0 → trend_percent = null   # не Infinity
иначе trend_percent = (current - previous) / previous * 100
```

Статус остатка (как на фронте):

```text
если current_stock <= 0                         → critical
если average_daily_sales <= 0                   → ok
если days_of_stock < 2                          → critical
если days_of_stock < 4                          → ending
если recommended_quantity > 0                   → low
иначе                                           → ok
```

Пример из UI: молоко, остаток 8, продажи 30 дн. = 140, coverage 7, safety 2, pack 10.

```text
avg = 140 / 30 ≈ 4.667
days_of_stock ≈ 1.71        → critical
required = 4.667 × 9 ≈ 42
raw = 42 - 8 = 34
recommended = ceil(34 / 10) * 10 = 40
```

---

## Что считать продажей

Не выдуманные статусы — те, которыми уже пользуется маркет.

Из истории продаж (`/crm/market/history`, `GET /main/pos/sales/`):

| `sale.status` | Учитывать в рекомендации |
|---|---|
| `paid` | **да** |
| `new` | **нет** (открытый/незавершённый чек) |
| `canceled` | **нет** |

Дополнительно не учитывать, если в данных встречаются:

- `cancelled`, `refunded`, `returned` (так нормализует аналитика).

Долг (`debt` / `unpaid` / оплата в долг) — это **совершённая продажа товара**, остаток уже списан. Такие чеки **учитывать**, если статус не `canceled`/`new`.

### Количество

- Брать количество строки продажи в учётной единице товара (`unit`), не в деньгах.
- Если строка продана «из упаковки» (piece sale, `quantity_in_package`), в агрегат должна попасть **базовая единица** (как на кассе: 1 шт из упаковки 12, а не 1 упаковка).
- Комплекты (`kit`): если продажа комплекта списывает компоненты — для рекомендации поставщика считать списание **компонента**, а не строки комплекта. Если бэкенд сейчас списывает только kit SKU — зафиксировать это в ответе и считать kit как отдельный товар.

### Возвраты

Есть `POST /main/pos/sales/{id}/return/`. Возвращённое количество **вычитать** из продаж периода, в который попал возврат (по дате возврата, не дате исходной продажи).

Итог за период:

```text
sales_qty = SUM(qty paid lines) - SUM(qty returned in period)
sales_qty = max(0, sales_qty)
```

Не считать отменённый чек и его возврат дважды.

### Время и таймзона

- Бизнес-таймзона: **Asia/Bishkek, UTC+6** (как в [`analytics.md`](./analytics.md)).
- Поле времени продажи: `paid_at`, fallback `created_at`.
- Окна **включительные**, в местном времени:

Для `analysis_days = 7` на момент `2026-08-11 13:00` Bishkek (скользящее окно):

- current: `2026-08-04T13:00:00` … `2026-08-11T13:00:00`
- previous: `2026-07-28T13:00:00` … `2026-08-04T13:00:00`

Проще и достаточно для v1 (так ожидает закупщик): **календарные дни** по Bishkek, включая сегодня:

- current 7д: сегодня и 6 предыдущих календарных дней, `00:00:00` … `23:59:59` каждого;
- previous 7д: 7 календарных дней сразу до current.

Выберите один вариант и придерживайтесь его во всех окнах 7/14/30. В ответе можно добавить `settings.window: "calendar_days"` для явности. Рекомендуется **календарные дни Bishkek**, включая сегодня.

Не интерпретировать naive datetime как UTC.

### Изоляция данных

Считать только продажи:

- текущей `company` (из токена);
- выбранного `branch_id`, если передан и пользователь имеет к нему доступ;
- без `branch_id` — как в остальных market-отчётах этой роли (owner/admin: все филиалы компании; ограниченный пользователь: свой филиал).

Не сканировать продажи всей платформы.

---

## Товары поставщика и остаток

Связь товар ↔ поставщик уже есть: поле товара `client` (uuid поставщика из `/main/clients/?type=suppliers`).

На фронте прихода товар без `client` предлагают привязать к выбранному поставщику одним `PATCH`. Это **один поставщик на товар**, не M2M.

В рекомендации:

1. Товары, у которых `client = supplier_id`.
2. Остаток — текущий `quantity` товара (как в `/main/suppliers/{id}/products/` и на складе).
3. Не включать удалённые / soft-deleted.
4. Услуги (`type=service`) не включать, если они не имеют складского остатка.

Если в модели когда-нибудь появится несколько поставщиков на SKU — это отдельная задача. Сейчас не выдумывать M2M.

`pack_size`:

- если у товара есть `packages` с `quantity_in_package > 1`, это **розничная** упаковка piece-sale;
- для закупки это разумный fallback;
- отдельное поле закупочной упаковки сейчас **нет**. Если появится `purchase_pack_size` — отдавать его как `pack_size`, приоритетнее retail package.

Весовой товар: `is_weight = true` **или** `scale_type = "weight"` (как на `/crm/scales`).

Единица: `product.unit`, пустое → `"шт"`. Не хардкодить «шт.» на бэкенде в подписях — фронт подставляет `unit` сам.

Последняя закупка — **последний приход этого товара** (документ `/main/suppliers/receipts/`), желательно у того же поставщика:

- `date` — datetime документа;
- `quantity` — qty строки;
- `purchase_price` — цена строки.

Не делать N запросов `GET /main/products/{id}/purchase-batches/`.

---

## Performance

Запрещено:

```text
1 × товары поставщика
+ N × продажи по товару
+ N × последний приход по товару
```

Нужна агрегация в одном запросе/view:

1. Товары `company + client=supplier` (+ branch/warehouse).
2. Остатки этих товаров.
3. `SUM(sale_item.qty)` по `product_id` за 6 окон: 7 / 14 / 30 current и previous.
4. Latest procurement per `product_id` (`DISTINCT ON` / window `row_number()`).
5. Pack/unit/is_weight.

Целевой SLA: каталог поставщика до 500 SKU — ответ **до 1–2 с**. `page_size` max 500, default 200. Фронт сейчас просит 500, чтобы пересчитывать coverage/safety без нового запроса.

Не отдавать полный список всех продаж компании на фронт.

---

## Indexes

Концептуально (имена Django-моделей неизвестны, репозитория бэкенда в этом фронте нет):

| Назначение | Поля |
|---|---|
| товары поставщика | `(company, client, deleted_at)` / `(company, client, branch)` |
| остаток | уже должен быть PK товара |
| продажи по времени | `(company, status, paid_at)` и/или `(company, created_at)` |
| строки продаж | `(sale_id, product_id)` и `(product_id)` |
| возвраты | `(company, returned_at, product_id)` |
| приходы | `(company, supplier_id, created_at)` |
| строки прихода | `(receipt_id, product_id)` и `(product_id, created_at DESC)` |

Индекс по `status + paid_at` критичен: в агрегате участвуют только `paid`.

---

## Validation

| Условие | Ответ |
|---|---|
| `analysis_days` не из `{7,14,30}` или `<= 0` | `400` `{ "detail": "…" }` |
| `coverage_days < 0` или `safety_days < 0` | `400` |
| `supplier_id` не uuid / не найден | `404` |
| поставщик другой компании | `404` (не светить чужой id) |
| поставщик `type != suppliers` | `400` `{ "detail": "Поставщик не найден" }` |
| `branch_id` / `warehouse_id` чужой компании | `400`/`404` |
| пользователь без доступа к филиалу | `403` или пустой результат по своим правилам как в аналитике |
| `page_size > 500` | `400` «не более 500» |
| невалидный query | `400` с `detail` на русском, не 500 |

---

## Permissions

Не создавать новое право без необходимости.

Экран встроен в «Закупки». Меню и список приходов уже требуют:

**`can_view_market_procurement`**

Тот же permission использовать для `GET …/recommendations/`.

Создание прихода после кнопки «Сформировать закупку» идёт существующим `POST /main/suppliers/{id}/receipt/` — права прихода не менять.

Тариф «Старт» скрывает пункты «Закупки» / «Поставщики» на фронте (`hideRules`). Бэкенд всё равно должен проверять company + permission.

Если позже понадобится отдельно запретить рекомендации, но оставить ручной приход — тогда новое право `can_view_market_procurement_recommendations`. Сейчас не нужно.

---

## Frontend fallback (пока эндпоинта нет)

```text
GET /main/suppliers/{id}/recommendations/
  → 200: UI рисует results
  → 404/405: UI берёт GET /main/suppliers/{id}/products/
             и помечает source=composed (баннер «продажи смоделированы»)
  → 401/403/5xx: UI показывает ошибку + retry, без демо-продаж
```

После выката API баннер пропадёт сам: фронт перестанет падать в composed-адаптер.

Менять UI не потребуется, если контракт выше соблюдён.

---

## Приёмочные сценарии

Данные: поставщик «Белая река», товар «Молоко 1 л», `unit=шт`, `is_weight=false`, `pack_size=10`, остаток 8, за 30 календарных дней Bishkek продано 140 (только `paid`), предыдущие 30 дн. — 112, последний приход 01.08.2026 × 40 шт по 62 сом.

| # | Запрос | Ожидание |
|---|---|---|
| 1 | `analysis_days=30&coverage_days=7&safety_days=2` | `average_per_day≈4.667`, `days_remaining≈1.71`, `status=critical`, `recommended_quantity=40` |
| 2 | тот же товар, продаж 0 | `days_remaining=null`, `recommended_quantity=0`, не `Infinity` |
| 3 | остаток 0, avg=5, coverage=7, safety=2, без pack | `recommended_quantity=45` |
| 4 | весовой, avg=2.5, coverage=7, safety=1, stock=7.5 | `recommended_quantity=12.5`, не 13 |
| 5 | previous_period=0, current=20 | `trend_percent=null` или отсутствует, не `Infinity` |
| 6 | в окне есть `canceled` на 50 шт | в сумму продаж **не** входят |
| 7 | возврат 5 шт в текущем окне | продажи уменьшены на 5 |
| 8 | чужой `supplier_id` | `404`, не данные другой компании |
| 9 | без `can_view_market_procurement` | `403` |
| 10 | 300 SKU поставщика | один HTTP-ответ, без N+1 в логах SQL |
| 11 | `page_size=501` | `400` |
| 12 | у поставщика 0 товаров | `200`, `results=[]` |

---

## Future improvements

Не делать в v1:

- график поставок / lead time поставщика;
- min/max stock на карточке (поле `minStock` на фронте формы товара **не персистится** в API);
- сезонность и weekday patterns;
- MOQ и кратность заказа поставщика отдельно от `pack_size`;
- вычитание промо-всплесков;
- резервы под отложенные продажи;
- автосоздание прихода по правилам;
- несколько поставщиков на один SKU.

Первая версия: один агрегирующий GET, прозрачная формула, те же права, что у закупок.
