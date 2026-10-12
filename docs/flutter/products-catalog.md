# Flutter: каталог товаров, склад, фильтры, штрихкоды

Список/поиск/фильтрация товаров склада (`/crm/sklad`). Создание и форма товара — отдельно: [add-product.md](./add-product.md), [product-form-layout.md](./product-form-layout.md).

**Бэкенд-док:** [warehouse-filters-backend.md](../backend/warehouse-filters-backend.md) (статус: отвечено бэкендом, контракт подтверждён).

---

## Содержание

1. [Список товаров и фильтры](#1-список-товаров-и-фильтры)
2. [Пресеты](#2-пресеты)
3. [Несоответствия полей модели](#3-несоответствия-полей-модели)
4. [Штрихкоды](#4-штрихкоды)
5. [Весы / PLU](#5-весы--plu)
6. [Справочники](#6-справочники)
7. [Чеклист Flutter](#7-чеклист-flutter)

---

## 1. Список товаров и фильтры

```http
GET /main/products/list/
```

Все параметры ниже **подтверждены рабочими**, кроме отмеченного.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `search` | string | Поиск. **Только** по названию/штрихкоду (доп. штрихкодам) — **не** ищет по артикулу/коду/PLU/бренду/категории |
| `page` | int | Пагинация |
| `kind` | `product` \| `service` \| `bundle`, можно несколько (`?kind=product&kind=service`) | Если выбраны все — параметр не слать |
| `is_weight` | `true` \| `false` | Весовой / штучный товар |
| `preset` | см. §2 | Готовые пресеты |
| `category` | uuid | id категории |
| `brand` | uuid | id бренда |
| `supplier` | uuid | id поставщика (это `client_id`, не отдельная сущность) |
| `price_type` | `base` \| `purchase` \| `cost` \| `discount` | `cost` и `purchase` — **одно и то же поле** `purchase_price` на бэке |
| `price_condition` | `gt` \| `lt` \| `eq` | вместе с `price_value` |
| `price_value` | number | — |
| `stock_type` | `total` | пока единственное значение |
| `stock_condition` | `gt` \| `lt` \| `eq` | вместе с `stock_value` |
| `stock_value` | number | — |
| `shelf_life_condition` | `expires_within` \| `expired` | по полю `expiration_date`; для `expired` значение дней игнорируется |
| `shelf_life_value` | int (дни) | — |
| `changes_condition` | `gt` \| `lt` \| `eq` | по `updated_at`, «изменён более/менее N дней назад» |
| `changes_value` | int (дни) | — |
| `sellability_condition` | `sold_within` \| `not_sold_within` | продавался/не продавался за N дней |
| `sellability_value` | int (дни) | — |
| `ordering` | `created_at` \| `updated_at` \| `price`, префикс `-` для убывания | Поддержан бэком, но UI сортировки пока нет (можно добавить на Flutter) |

**`sale_unit` (`weight`/`piece`/`piece_sale`) — не существует на бэке.** Фильтровать по нему нужно **на клиенте** после загрузки страницы (постоянный workaround, не временный).

```dart
class ProductListFilters {
  String? search;
  int page = 1;
  List<ProductKind> kind = [];
  bool? isWeight;
  ProductPreset? preset;
  String? categoryId;
  String? brandId;
  String? supplierId;
  PriceFilter? price;      // {type, condition, value}
  StockFilter? stock;      // {condition, value} — type всегда 'total'
  ShelfLifeFilter? shelfLife;
  ChangesFilter? changes;
  SellabilityFilter? sellability;
  String? ordering;

  /// sale_unit — не шлём на сервер, фильтруем локально после ответа.
  SaleUnit? clientSideSaleUnit;

  Map<String, dynamic> toQuery() {
    final q = <String, dynamic>{'page': page};
    if (search != null && search!.isNotEmpty) q['search'] = search;
    if (kind.isNotEmpty && kind.length < ProductKind.values.length) {
      q['kind'] = kind.map((k) => k.apiValue).toList();
    }
    if (isWeight != null) q['is_weight'] = isWeight;
    if (preset != null) q['preset'] = preset!.apiValue;
    if (categoryId != null) q['category'] = categoryId;
    if (brandId != null) q['brand'] = brandId;
    if (supplierId != null) q['supplier'] = supplierId;
    if (price != null) {
      q['price_type'] = price!.type;
      q['price_condition'] = price!.condition;
      q['price_value'] = price!.value;
    }
    // ... stock / shelfLife / changes / sellability аналогично
    if (ordering != null) q['ordering'] = ordering;
    return q;
  }
}

List<Product> applyClientSideSaleUnit(List<Product> items, SaleUnit? unit) {
  if (unit == null) return items;
  return items.where((p) => p.saleUnit == unit).toList();
}
```

---

## 2. Пресеты

`preset=` — один из 8 подтверждённых значений:

| Пресет | Значение |
|--------|----------|
| `discounted` | Товары со скидкой |
| `shelf_life_expires_7d` | Срок годности истекает в течение 7 дней |
| `zero_cost` | Нулевая себестоимость |
| `shelf_life_expired` | Срок годности истёк |
| `out_of_stock` | Нет в наличии |
| `not_sold_90d` | Не продавался 90 дней |
| `negative_stock` | Отрицательный остаток |
| `stock_below_min` | Остаток ниже минимального (`minimum_quantity`) |

Пороги (7 дней, 90 дней) зашиты на бэке — не дублировать другими значениями на клиенте.

---

## 3. Несоответствия полей модели

Важно при парсинге ответа `GET /main/products/list/` и карточки товара — **имена полей отличаются** от того, что можно было бы ожидать по фильтрам:

| Ожидаемое имя | Фактическое имя в ответе | Тип |
|---------------|---------------------------|-----|
| `cost` | `purchase_price` | decimal-строка |
| `min_stock` | `minimum_quantity` | number |
| `category` | строка (`.name`), **не id** | string |
| `brand` | строка (`.name`), **не id** | string |
| `suppliers` | `[{ id, full_name }]` | array of object |

```dart
class Product {
  final String id;
  final String name;
  final String barcode;
  final List<String> alternateBarcodes;
  final String purchasePrice;     // ex-"cost"
  final int minimumQuantity;      // ex-"min_stock"
  final String? categoryName;     // строка, не id!
  final String? brandName;        // строка, не id!
  final List<SupplierRef> suppliers; // [{id, full_name}]
  final bool isWeight;
  final bool isAdult;
  final String? plu;
  final ProductKind kind;         // product | service | bundle
}
```

Если нужен id категории/бренда для фильтра — брать из отдельного справочника (`GET /main/categories/`, `GET /main/brands/`), не из карточки товара.

---

## 4. Штрихкоды

```http
GET /main/products/global-barcode/{code}/      // товар из общего справочника (не привязан к складу)
GET /main/products/warehouse-barcode/{code}/   // товар на складе компании
```

`{code}` — URL-encode. Поиск учитывает `barcode ∪ alternate_barcodes`.

Массовое сканирование на склад — см. [mass-scan.md](./mass-scan.md).

---

## 5. Весы / PLU

- `GET /main/products/list/?is_weight=true` — весовые товары.
- `POST /users/scales/send-products/` — экспорт товаров на весы.
- `GET /main/products/scale-export/` — файл экспорта.
- `GET /users/scales/token/` — токен для интеграции весов.
- `GET/PATCH /users/settings/company/` — `scale_barcode_layout`, `scale_barcode_mode`.
- `POST /main/pos/sales/{id}/scan/` — сканирование штрихкода на кассе, обрабатывает и обычные, и весовые (PLU) штрихкоды в одном эндпоинте.

---

## 6. Справочники

```http
GET/POST /main/brands/
GET/POST /main/categories/
GET/POST /main/clients/?type=suppliers   // поставщики — это клиенты с типом supplier
```

Изображения товара:

```http
POST   /main/products/{id}/images/
DELETE /main/products/{id}/images/{imageId}/
```

(multipart/form-data — не слать `Content-Type: application/json` на этот запрос).

---

## 7. Чеклист Flutter

- [ ] Все фильтры из §1, кроме `sale_unit`, слать на сервер как query-параметры
- [ ] `sale_unit` — фильтровать локально после получения страницы
- [ ] Парсинг ответа учитывает переименования полей (§3): `purchase_price`, `minimum_quantity`, строковые `category`/`brand`, `suppliers[]`
- [ ] `search` не искать по артикулу/бренду/категории — не полагаться на это в UI-подсказках
- [ ] `price_type=cost` и `price_type=purchase` — один и тот же результат, не показывать как два разных фильтра, если не нужно сохранять паритет с вебом
- [ ] Пороги пресетов (7д/90д) не дублировать константами на клиенте
- [ ] Штрихкоды — искать по `barcode ∪ alternate_barcodes` через оба GET-эндпоинта (global/warehouse)
- [ ] Загрузка изображений — multipart, без `Content-Type: application/json`

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [add-product.md](./add-product.md) | Создание / редактирование товара |
| [product-form-layout.md](./product-form-layout.md) | Раскладка формы товара |
| [adult-products.md](./adult-products.md) | Товар 18+ |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Приход/списание/возврат — денежная сторона |
| [analytics.md](./analytics.md) | Отчёты по складу |
