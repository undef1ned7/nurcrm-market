# Flutter: рекомендуемый заказ

**Веб-страница:** `/crm/market/procurement/recommendations`  
**Веб-код:** `src/features/procurement-recommendations/`  
**Эндпоинт:** `GET /main/suppliers/{supplier_id}/recommendations/`  
**Бэкенд-док:** [procurement-recommendations-backend.md](../backend/procurement-recommendations-backend.md)

**Статус:** веб готов. При `404`/`405` — composed из `GET /main/suppliers/{id}/products/` + модельные продажи + баннер. После API баннер пропадает сам.

Право: **`can_view_market_procurement`**. Приход после «Сформировать закупку» — существующий `POST /main/suppliers/{id}/receipt/`.

Система **не создаёт** приход сама — только аналитика.

---

## 1. Endpoint

```http
GET /main/suppliers/{supplier_id}/recommendations/
Authorization: Bearer <access_token>
```

Алиас: `GET /main/procurement-recommendations/?supplier_id=` — путь в одном месте (`RECOMMENDATIONS_API_PATH`).

Не использовать `/api/v1`.

---

## 2. Query params

Фронт передаёт:

| Параметр | Тип | Default | Значения |
|---|---|---|---|
| `analysis_days` | int | 30 | `7 \| 14 \| 30` |
| `coverage_days` | int | 7 | `3 \| 7 \| 14` |
| `safety_days` | int | 2 | `0 \| 1 \| 2 \| 3` |
| `branch_id` | uuid | филиал профиля | опционально |
| `page_size` | int | веб шлёт `500` | max 500 |
| `page` | int | 1 | |

После появления API можно слать на сервер (сейчас клиентский фильтр):

| Параметр | Описание |
|---|---|
| `search` | имя / barcode / article / code |
| `only_required` | только `recommended_quantity > 0` |
| `stock_status` | `critical \| ending \| low \| ok` |

`warehouse_id` зарезервирован — веб пока не шлёт.

Клиент **пересчитывает** рекомендацию локально при смене coverage/safety, опираясь на сырые продажи 7/14/30. Поэтому в ответе обязательны окна продаж, а не только итог.

---

## 3. Response — что читать

Парсер веба: `mapRecommendationResponse.ts`.

```dart
class RecommendationRow {
  final String productId;
  final String productName;
  final String? barcode;
  final String? article;
  final String? code;
  final String unit;           // fallback 'шт'
  final bool isWeight;
  final double currentStock;
  final double? purchasePrice;
  final int? packSize;
  final SalesWindows sales;
  final LastPurchase? lastPurchase;
  final double? recommendedQuantity; // опционально с бэка
  final String? stockStatus;
  final double? daysRemaining;
}
```

Обязательно:

| JSON | Куда |
|---|---|
| `supplier.id`, `supplier.name` / `full_name` | шапка |
| `results[]` / `items[]` | таблица |
| `product_id` / `productId` / `id` | ключ |
| `product_name` / `productName` / `name` | название |
| `unit` | единица |
| `is_weight` / `scale_type` | весовой (`weight`) |
| `current_stock` / `currentStock` / `quantity` | остаток |
| `sales.last_7_days` / `sales7d` | колонка 7 дн. |
| `sales.last_14_days` / `sales14d` | окно 14 |
| `sales.last_30_days` / `sales30d` | колонка 30 дн. |

Желательно: `barcode`, `article`, `code`, `purchase_price`, `pack_size` / `packages[].quantity_in_package`, previous-окна продаж, `last_purchase.*`, `summary.*`.

Пустой каталог: `200`, `results: []`, `count: 0`.

`estimated_total` в summary = Σ(recommended × purchase_price) где цена есть; если ни у кого нет цены — `null`, не `0`.

---

## 4. Формула (обязательно совпасть с вебом)

Веб: `recommendationMath.ts`.

```text
sales_qty            = продажи за analysis_days
average_daily_sales  = sales_qty / analysis_days
days_of_stock        = current_stock / average_daily_sales   # null, если avg <= 0
required_stock       = average_daily_sales × (coverage_days + safety_days)
raw_recommendation   = required_stock - current_stock
recommended_quantity = max(0, raw_recommendation)
```

Округление:

- **Штучный** (`is_weight != true` и `scale_type != "weight"`):  
  `ceil(raw)`; если `pack_size > 1` → `ceil(raw / pack_size) * pack_size`.
- **Весовой**: до 3 знаков, без `ceil` до целого, `pack_size` не применять.
- Мусорный stock/sales → `0`.
- Нет продаж → `days_of_stock = null` (UI: «Нет продаж», не Infinity).

Тренд:

```text
если previous = 0 и current = 0 → 0
если previous = 0 и current > 0 → null
иначе (current - previous) / previous * 100
```

Статус остатка:

```text
stock <= 0              → critical
avg <= 0                → ok
days_of_stock < 2       → critical
days_of_stock < 4       → ending
recommended > 0         → low
иначе                   → ok
```

Пример: stock 8, sales30=140, coverage 7, safety 2, pack 10 → recommended **40**.

---

## 5. UI

1. Выбор поставщика (`GET /main/clients/?type=suppliers`).
2. Настройки: analysis / coverage / safety (persist локально, как веб `settingsStorage`).
3. Таблица: товар, остаток, продажи 7/30, тренд, запас (дни), последняя закупка, **Заказать** (editable).
4. Summary bar: товаров / к заказу / critical / предварительная сумма.
5. Фильтры: поиск, only_required, stock_status.
6. Кнопка «Сформировать закупку» → существующий flow прихода с предзаполненными qty.

Не грузить полный список продаж компании на клиент, когда API есть.

---

## 6. Fallback

```text
GET …/recommendations/
  → 200: рисовать results
  → 404/405: GET …/products/ + source=composed + баннер «продажи смоделированы»
  → 401/403/5xx: ошибка + retry, без демо-продаж
```

---

## 7. Чеклист Flutter

- [ ] GET recommendations с query analysis/coverage/safety
- [ ] Парсер алиасов как на вебе
- [ ] Локальный пересчёт recommended при смене настроек
- [ ] Весовой vs штучный + pack_size
- [ ] Статусы critical/ending/low/ok
- [ ] Editable колонка «Заказать» → переход в приход
- [ ] Soft fallback 404/405 с баннером
- [ ] Право procurement / hideRules «Старт»
