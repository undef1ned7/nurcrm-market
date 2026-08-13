# Маркет — История закупок и возврат поставщикам: ТЗ для бэкенда

**Страницы:**
- `/crm/market/procurement` — вкладка «История закупок»
- `/crm/market/procurement?tab=returns` — вкладка «Возвраты поставщикам»
- `/crm/market/procurement/return` — оформление возврата
- `/crm/market/procurement/return?supplier_id=&receipt_id=` — возврат из конкретного прихода

**Фронт:** `src/pages/warehouse/ui/SupplierReceiptsListPage.tsx`, `src/features/supplier-returns/`

**Статус:** фронт готов. История приходов уже ходит в существующий `GET /main/suppliers/receipts/`. Возвраты: эндпоинтов нет; при `404`/`405` фронт списывает остаток через `PATCH /main/products/{id}/`, при компенсации `cash` пишет приход в кассу и хранит документ в `localStorage`. Это fallback одного устройства, не источник правды.

Связанные существующие эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `GET` | `/main/suppliers/receipts/` | список приходов (история закупок) |
| `GET` | `/main/suppliers/receipts/{id}/` | позиции прихода |
| `POST` | `/main/suppliers/{id}/receipt/` | создание прихода |
| `GET` | `/main/clients/?type=suppliers` | поставщики |
| `GET` | `/main/suppliers/{id}/products/` | товары поставщика + остаток |
| `PATCH` | `/main/products/{id}/` | fallback списания остатка |
| `POST` | `/construction/cashflows/` | fallback прихода в кассу |
| `GET` | `/main/products/{id}/purchase-batches/` | партии; не использовать в list-API |

Не использовать `/api/v1`.

---

## Purpose

Администратор магазина в одном разделе «Закупки»:

1. Видит **историю приходов** (кто, когда, на какую сумму, какие позиции).
2. Оформляет **возврат поставщику** (брак, излишек, ошибка поставки, просрочка).
3. Возврат **уменьшает складской остаток** атомарно вместе с документом.
4. Деньги: приход в кассу, уменьшение долга поставщику, либо только склад.

Система должна работать как зеркало прихода: документ + строки + побочные эффекты в одной транзакции. Не повторять фронтовый fallback (N × PATCH товара).

---

## 1. История закупок (уже есть, доработать)

Фронт уже вызывает:

```http
GET /main/suppliers/receipts/?page=1&limit=20&supplier_id=&date_from=&date_to=&search=
Authorization: Bearer <access_token>
```

И деталку:

```http
GET /main/suppliers/receipts/{id}/
```

### Query (история)

| Параметр | Тип | Обяз. | Зачем |
|---|---|---|---|
| `page` | int | нет | пагинация, default 1 |
| `limit` | int | нет | page size, default 20, max 100. Алиас `page_size` |
| `supplier_id` | uuid | нет | фильтр по поставщику |
| `date_from` | `YYYY-MM-DD` | нет | включительно, Asia/Bishkek |
| `date_to` | `YYYY-MM-DD` | нет | включительно, до `23:59:59` Bishkek |
| `search` | string | нет | поставщик / имя товара / barcode / article в строках прихода |

`date_from > date_to` → `400`.

Таймзона: **Asia/Bishkek, UTC+6**. Naive date — местный календарный день, не UTC.

### List item (обязательно для фронта)

Парсер списка терпим к алиасам, но целевой контракт:

```json
{
  "count": 42,
  "next": null,
  "previous": null,
  "total_amount": 128500.50,
  "meta": { "total_amount": 128500.50 },
  "results": [
    {
      "id": "uuid",
      "supplier_id": "15",
      "supplier_name": "Белая река",
      "created_at": "2026-08-01T10:20:00+06:00",
      "created_by_name": "Айжан",
      "items_count": 12,
      "total_amount": 24800,
      "returned_amount": 1240,
      "returned_qty": 2,
      "has_returns": true
    }
  ]
}
```

Фронт сейчас читает:

| JSON | Куда |
|---|---|
| `results[]` | таблица |
| `id` / `uuid` | ключ, деталка, кнопка «Вернуть» |
| `supplier_id` / `supplierId` | префилл возврата |
| `supplier_name` | колонка |
| `created_by_name` | колонка |
| `created_at` | колонка |
| `items[]` или `items_count` | число позиций |
| `total_amount` / `amount` / `sum` или сумма `qty * purchase_price` | сумма |
| `count`, `next`, `previous` | пагинация |
| `total_amount` / `meta.total_amount` | карточка «Общая сумма» (по текущему фильтру) |

Желательно добавить (фронт начнёт показывать без ломания):

- `has_returns`, `returned_amount`, `returned_qty`
- `items_count` в списке, **без** разворота всех `items[]` — иначе тяжёлый list

Деталка `{id}/` должна вернуть `items` / `lines`:

```json
{
  "id": "uuid",
  "supplier_id": "15",
  "supplier_name": "Белая река",
  "created_at": "2026-08-01T10:20:00+06:00",
  "created_by_name": "Айжан",
  "total_amount": 24800,
  "items": [
    {
      "id": "line-uuid",
      "product_id": "123",
      "product_name": "Молоко 1 л",
      "qty": 40,
      "purchase_price": 62,
      "returned_qty": 5,
      "returnable_qty": 35,
      "unit": "шт"
    }
  ]
}
```

`returnable_qty` на строке прихода:

```text
returnable_qty = max(0, min(current_stock, purchased_qty - already_returned_qty))
```

Не отдавать N+1 `purchase-batches`. `total_amount` в list-meta — сумма документов **после фильтров**, не всей компании.

---

## 2. Возвраты поставщикам (новые эндпоинты)

Почему этот path: закупки маркета уже живут в `/main/suppliers/…`.

```http
GET    /main/suppliers/returns/
GET    /main/suppliers/returns/{id}/
POST   /main/suppliers/{supplier_id}/returns/
```

Фронт вызывает **эти** пути (`RETURNS_LIST_PATH`, `RETURNS_CREATE_PATH`). Алиас коллекции `GET /main/supplier-returns/?supplier_id=` допустим, если напишете — путь на фронте меняется в одном месте.

Не делать через `warehouse/agent-return-carts/` — это другой сектор (агенты).

### 2.1 Список

```http
GET /main/suppliers/returns/?page=1&limit=20&supplier_id=&date_from=&date_to=&reason=&search=
```

| Параметр | Тип | Описание |
|---|---|---|
| `page`, `limit` | int | как у приходов, `limit` max 100, default 20 |
| `supplier_id` | uuid | фильтр |
| `date_from`, `date_to` | `YYYY-MM-DD` | Bishkek, включительно |
| `reason` | `defect \| surplus \| wrong_item \| expired \| other` | причина |
| `search` | string | поставщик / товар / комментарий |
| `receipt_id` | uuid | опционально: возвраты этого прихода |

`200`:

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "total_amount": 3720,
  "meta": { "total_amount": 3720 },
  "results": [
    {
      "id": "ret-1",
      "supplier_id": "15",
      "supplier_name": "Белая река",
      "receipt_id": "rec-1",
      "created_at": "2026-08-11T14:00:00+06:00",
      "created_by_name": "Айжан",
      "reason": "defect",
      "comment": "Вздутая упаковка",
      "compensation": "cash",
      "status": "posted",
      "items_count": 2,
      "total_amount": 1240
    }
  ]
}
```

Пустой список: `200`, `results: []`, `count: 0`. Не 404.

Деталка — тот же объект + `items[]` (см. create response).

### 2.2 Создание

```http
POST /main/suppliers/{supplier_id}/returns/
Content-Type: application/json
```

```json
{
  "receipt_id": "rec-1",
  "reason": "defect",
  "comment": "Вздутая упаковка",
  "compensation": "cash",
  "cashbox_id": "cashbox-uuid",
  "items": [
    {
      "product_id": "123",
      "qty": 2,
      "purchase_price": 62,
      "receipt_item_id": "line-uuid"
    }
  ]
}
```

| Поле | Обяз. | Правила |
|---|---|---|
| `items` | да | ≥ 1 строка |
| `items[].product_id` | да | товар компании, желательно `client = supplier_id` |
| `items[].qty` | да | `> 0`. Штучный — целое. Весовой (`is_weight` или `scale_type=weight`) — до 3 знаков |
| `items[].purchase_price` | нет | ≥ 0; default — цена строки прихода или `product.purchase_price` |
| `items[].receipt_item_id` | нет | если задан `receipt_id` — привязать к строке |
| `receipt_id` | нет | приход **этого** поставщика; частичный возврат разрешён |
| `reason` | да | enum выше |
| `comment` | нет | обязателен, если `reason=other` |
| `compensation` | да | `cash \| debt_offset \| none` |
| `cashbox_id` | если `cash` и сумма > 0 | касса компании |

`201 Created` (допустим `200`) — документ после проводки:

```json
{
  "id": "ret-1",
  "supplier_id": "15",
  "supplier_name": "Белая река",
  "receipt_id": "rec-1",
  "created_at": "2026-08-11T14:00:00+06:00",
  "created_by_name": "Айжан",
  "reason": "defect",
  "comment": "Вздутая упаковка",
  "compensation": "cash",
  "status": "posted",
  "items_count": 1,
  "total_amount": 124,
  "items": [
    {
      "id": "item-1",
      "product_id": "123",
      "product_name": "Молоко 1 л",
      "qty": 2,
      "purchase_price": 62,
      "line_total": 124,
      "unit": "шт",
      "receipt_item_id": "line-uuid"
    }
  ]
}
```

Алиасы, которые фронт уже понимает: `uuid`, `supplierId`, `compensation_type`, `lines`, `quantity`, `amount`.

---

## 3. Проводка (одна транзакция)

Документ `posted` только если **все** шаги успешны. Иначе rollback, `400`/`409`, склад не менять.

1. **Склад.** Для каждой строки `product.quantity -= qty`. Не уходить в минус.
2. **Лимит по приходу** (если есть `receipt_id` / `receipt_item_id`):
   `already_returned + qty <= purchased_qty`.
3. **Деньги** по `compensation`:
   - `cash` — приход в кассу на `sum(qty * purchase_price)`, `source_business_operation_id = "Возврат поставщику"`. Статус кассовой операции как у закупки: тариф «Старт» → `approved`, иначе `pending`.
   - `debt_offset` — уменьшить долг/сделку поставщика на сумму возврата (не больше текущего долга). Остаток долга не уводить в минус без явного кредита.
   - `none` — только склад.
4. **Партии.** Если есть `purchase-batches` — списывать с партии прихода (FIFO по этому поставщику, если строки без `receipt_item_id`).
5. **Идемпотентность.** Повтор того же тела не должен дважды списать остаток. Достаточно уникальности документа; отдельный `Idempotency-Key` не обязателен в v1.

Не делать так:

```text
N × PATCH /main/products/{id}/
+ отдельный cashflow
+ localStorage документ
```

Это текущий фронтовый fallback, не целевая модель.

### Лимиты количества

```text
max_qty = min(current_stock, purchased_qty - already_returned_qty)  # если привязан приход
max_qty = current_stock                                             # свободный возврат
```

Весовой: не `ceil`. Штучный: целое.

Товар другой компании / не этого поставщика → `400`. Услуги без остатка не принимать.

---

## 4. Validation

| Условие | Ответ |
|---|---|
| пустой `items` | `400` `{ "detail": "Укажите хотя бы одну позицию" }` |
| `qty <= 0` или штучный не целый | `400` |
| `qty > stock` | `409` «Нельзя вернуть больше остатка» |
| `qty > returnable` по приходу | `409` «Уже возвращено N из M» |
| `reason` не из enum | `400` |
| `reason=other` и пустой `comment` | `400` |
| `compensation=cash`, сумма > 0, нет/чужая касса | `400` |
| `supplier_id` не найден / другая компания | `404` |
| `supplier` не `type=suppliers` | `400` |
| `receipt_id` другого поставщика | `400` |
| `date_from > date_to` | `400` |
| `limit > 100` | `400` |
| без права | `403` |
| чужой id | `404` (не светить) |

`detail` на русском, не 500 на валидации.

---

## 5. Permissions

Не создавать новое право.

Экран встроен в «Закупки»: **`can_view_market_procurement`**.

Тот же permission на list/detail/create возвратов.

Тариф «Старт» скрывает пункт меню на фронте (`hideRules`). Бэкенд всё равно проверяет company + permission.

Если позже нужно запретить возврат, оставив приход — `can_create_market_supplier_return`. Сейчас не нужно.

---

## 6. Performance / indexes

Запрещён N+1: list приходов и возвратов без JOIN всех строк. `items_count` и `total_amount` — агрегаты.

Концептуально:

| Назначение | Поля |
|---|---|
| приходы компании | `(company, created_at DESC)` `(company, supplier_id, created_at)` |
| строки прихода | `(receipt_id, product_id)` |
| возвраты | `(company, created_at DESC)` `(company, supplier_id, created_at)` |
| строки возврата | `(return_id)` `(receipt_item_id)` `(product_id)` |
| остаток | PK товара |

SLA: страница 20 документов до 300–500 мс. Каталог возврата — товары одного поставщика, не весь склад компании.

---

## 7. Frontend fallback (пока эндпоинта нет)

```text
GET  /main/suppliers/returns/
POST /main/suppliers/{id}/returns/
  → 200/201: UI рисует серверные документы
  → 404/405: UI
        1) PATCH quantity по каждому товару
        2) cash → POST cashflow income
        3) debt_offset → только предупреждение «поправьте долг вручную»
        4) документ в localStorage ключ nur-market.supplier-returns.{companyId}
  → 401/403/5xx: ошибка + retry, без молчаливого fallback
```

После выката API баннер пропадёт сам. Менять UI не потребуется, если контракт выше соблюдён.

`GET /main/suppliers/receipts/` при 404 **не** подменяется — это уже рабочий метод.

---

## 8. Приёмочные сценарии

Данные: поставщик «Белая река», приход 01.08.2026: молоко 40 шт × 62, остаток сейчас 8, ранее возвращено 0.

| # | Действие | Ожидание |
|---|---|---|
| 1 | `GET /receipts/?date_from=2026-08-01&date_to=2026-08-01` | документ в списке, `total_amount` по фильтру |
| 2 | `GET /receipts/{id}/` | 1 строка, `qty=40`, `purchase_price=62` |
| 3 | `POST .../returns/` qty=2, compensation=cash | `201`, stock 6, касса +124, `total_amount=124` |
| 4 | повторный возврат qty=40 по тому же приходу | `409`, stock не меняется |
| 5 | qty=8.5 по штучному | `400` |
| 6 | весовой qty=1.25, stock=7.5 | `201`, stock=6.25 |
| 7 | `compensation=none` | склад −qty, касса без движения |
| 8 | `compensation=debt_offset` при долге 1000 и сумме 124 | долг 876 |
| 9 | чужой `supplier_id` | `404` |
| 10 | без `can_view_market_procurement` | `403` |
| 11 | `GET /returns/` после шага 3 | 1 документ, `reason=defect` |
| 12 | `search=Молоко` в истории | приход находится по строке |
| 13 | две строки в одном POST, вторая невалидна | ничего не списано |

---

## 9. Future improvements

Не делать в v1:

- черновик возврата / согласование;
- замена товара вместо денег;
- печать накладной возврата (можно следующим этапом по PDF прихода);
- автосоздание возврата из брака на карточке склада;
- несколько поставщиков на SKU.

Первая версия: list приходов с агрегатами, CRUD-минимум возврата (list + get + post), атомарная проводка склада и денег.
