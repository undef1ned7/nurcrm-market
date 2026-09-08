# Flutter: история закупок и возврат поставщикам

**Веб-страницы:**
- `/crm/market/procurement` — вкладка «История закупок»
- `/crm/market/procurement?tab=returns` — «Возвраты поставщикам»
- `/crm/market/procurement/return` — оформление возврата
- `/crm/market/procurement/return?supplier_id=&receipt_id=` — возврат из прихода

**Веб-код:** `src/pages/warehouse/ui/SupplierReceiptsListPage.tsx`, `src/features/supplier-returns/`  
**Бэкенд-док:** [procurement-history-returns-backend.md](../backend/kassa/procurement-history-returns-backend.md)

**Статус:** веб готов. История приходов — `GET /main/suppliers/receipts/`. Возвраты: при `404`/`405` — fallback (PATCH остатка + cashflow + localStorage). После API fallback отключается сам.

Право: **`can_view_market_procurement`**. Тариф «Старт» скрывает меню на клиенте (`hideRules`), API всё равно проверяет permission.

---

## 1. Purpose

В разделе «Закупки»:

1. История приходов (кто, когда, сумма, позиции).
2. Оформление возврата поставщику.
3. Возврат уменьшает остаток атомарно (на бэке).
4. Компенсация: касса / долг / только склад.

Не использовать `/api/v1` и не путать с `warehouse/agent-return-carts/` (другой сектор).

---

## 2. История закупок

### List

```http
GET /main/suppliers/receipts/?page=1&limit=20&supplier_id=&date_from=&date_to=&search=
```

| Параметр | Тип | Default | Зачем |
|---|---|---|---|
| `page` | int | 1 | пагинация |
| `limit` | int | 20, max 100 | алиас `page_size` |
| `supplier_id` | uuid | — | фильтр |
| `date_from` / `date_to` | `YYYY-MM-DD` | — | Bishkek, включительно |
| `search` | string | — | поставщик / товар / barcode / article |

`date_from > date_to` → не слать / показать ошибку.

### Парсинг list item

```dart
class SupplierReceiptListItem {
  final String id;
  final String? supplierId;
  final String? supplierName;
  final DateTime? createdAt;
  final String? createdByName;
  final int itemsCount;
  final double totalAmount;
  final double? returnedAmount;
  final double? returnedQty;
  final bool hasReturns;
}
```

Читать алиасы:

| JSON | Куда |
|---|---|
| `id` / `uuid` | ключ, деталка, «Вернуть» |
| `supplier_id` / `supplierId` | префилл возврата |
| `supplier_name` | колонка |
| `created_by_name` | колонка |
| `created_at` | колонка |
| `items[]` length или `items_count` | число позиций |
| `total_amount` / `amount` / `sum` | сумма |
| `count`, `next`, `previous` | пагинация |
| `total_amount` / `meta.total_amount` (корень) | карточка «Общая сумма» по фильтру |
| `has_returns`, `returned_amount`, `returned_qty` | желательно |

### Detail

```http
GET /main/suppliers/receipts/{id}/
```

Строки: `items` / `lines` с `product_id`, `product_name`, `qty`, `purchase_price`, `returned_qty`, `returnable_qty`, `unit`.

```text
returnable_qty = max(0, min(current_stock, purchased_qty - already_returned_qty))
```

Не дергать N+1 `purchase-batches` для списка.

---

## 3. Возвраты — API

```http
GET    /main/suppliers/returns/
GET    /main/suppliers/returns/{id}/
POST   /main/suppliers/{supplier_id}/returns/
```

Алиас коллекции `GET /main/supplier-returns/?supplier_id=` допустим — путь в одном месте (`RETURNS_LIST_PATH`).

### List query

`page`, `limit`, `supplier_id`, `date_from`, `date_to`, `reason`, `search`, `receipt_id`.

Пустой список: `200`, `results: []`, `count: 0` — не трактовать как ошибку.

### Create body

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
| `items` | да | ≥ 1 |
| `items[].product_id` | да | |
| `items[].qty` | да | `> 0`; штучный — целое; весовой — до 3 знаков |
| `items[].purchase_price` | нет | ≥ 0 |
| `items[].receipt_item_id` | нет | привязка к строке прихода |
| `receipt_id` | нет | частичный возврат ок |
| `reason` | да | `defect \| surplus \| wrong_item \| expired \| other` |
| `comment` | если `other` | обязателен |
| `compensation` | да | `cash \| debt_offset \| none` |
| `cashbox_id` | если `cash` и сумма > 0 | |

Ожидание: `201`/`200` с документом + `items[]`.

Алиасы ответа: `uuid`, `supplierId`, `compensation_type`, `lines`, `quantity`, `amount`.

---

## 4. UI экранов

### Вкладка «История»

- Фильтры: поставщик, период, поиск.
- Таблица: дата, поставщик, кто создал, позиций, сумма, индикатор возвратов.
- Клик → деталка прихода.
- Кнопка «Вернуть» → `/return?supplier_id=&receipt_id=`.
- Карточка «Общая сумма» = `total_amount` / `meta.total_amount` по текущему фильтру.

### Вкладка «Возвраты»

- Список документов: дата, поставщик, причина, компенсация, сумма, статус.
- Клик → деталка (позиции).

### Форма возврата

1. Поставщик (обязателен).
2. Опционально приход → подставить returnable qty.
3. Причина + комментарий (`other` → comment required).
4. Компенсация: cash / debt_offset / none.
5. Если cash — выбор кассы.
6. Таблица позиций: qty ≤ returnable / stock; весовой vs штучный.
7. Итог = Σ(qty × purchase_price).
8. Submit → POST; успех → тост + список возвратов.

Лимиты qty на клиенте:

```text
max_qty = min(stock, purchased - already_returned)  // с приходом
max_qty = stock                                      // свободный
```

---

## 5. Fallback (пока нет API возвратов)

```text
GET/POST returns
  → 200/201: серверные документы
  → 404/405:
        1) PATCH /main/products/{id}/  quantity -= qty  (по каждому товару)
        2) cash → POST /construction/cashflows/ income
        3) debt_offset → предупреждение «поправьте долг вручную»
        4) документ в local store: nur-market.supplier-returns.{companyId}
  → 401/403/5xx: ошибка + retry, БЕЗ молчаливого fallback
```

`GET /main/suppliers/receipts/` при 404 **не** подменять — это уже рабочий метод.

После выката API баннер «локальный режим» убрать автоматически.

---

## 6. Ошибки UI

| Ответ | Показ |
|---|---|
| `400` с `detail` | текст как есть |
| `409` «Нельзя вернуть больше остатка» / «Уже возвращено N из M» | блокирующее |
| `403` | нет права |
| `404` чужой id | «Не найдено» |

Не делать N × PATCH как целевую модель — только fallback.

---

## 7. Чеклист Flutter

- [ ] List/detail приходов с фильтрами и пагинацией
- [ ] Карточка общей суммы по фильтру
- [ ] List возвратов + create form
- [ ] Валидация reason/comment/qty/cashbox
- [ ] Весовой qty до 3 знаков, штучный — int
- [ ] Soft fallback 404/405 с баннером
- [ ] Жёсткая ошибка на 401/403/5xx
- [ ] Право `can_view_market_procurement` / hideRules «Старт»
