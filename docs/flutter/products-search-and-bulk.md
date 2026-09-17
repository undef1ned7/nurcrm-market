# Flutter: поиск по штрихкоду в продажах, доп. штрихкоды, массовое изменение товаров

Дополняет [products-catalog.md](./products-catalog.md) (список/фильтры/базовые штрихкод-эндпоинты) —
здесь три отдельных контракта, которых там нет: поиск продаж по штрихкоду, полный контракт
`alternate_barcodes` (несколько кодов на товар) и массовое изменение бренда/категории/поставщика.

**Веб-экраны:**
- Продажи / история: `/crm/market/history` — `src/pages/sales-history/ui/History.tsx`
- Касса: `/crm/market/cashier` — `src/Components/Sectors/Market/CashierPage/CashierPage.jsx`
- Склад: `/crm/sklad` — `src/Components/Sectors/Market/Warehouse/Warehouse.jsx`
- Печать штрихкодов: `/crm/barcodes` — `src/Components/Deposits/Sklad/components/BarcodePrintTab.jsx`
- Карточка товара: `src/Components/Deposits/Sklad/AddProductPage` (поле «Дополнительные штрихкоды»)

**Веб-код эталон:**
- `src/pages/sales-history/ui/History.tsx` — фильтр `barcode` в истории продаж
- `src/api/products.js` → `bulkUpdateProductsApi` — вызов bulk-update
- `src/store/creators/productCreators.js` → `bulkUpdateProductsAsync` — thunk + временный fallback на N×PATCH
- `src/store/slices/productSlice.js` — состояние `bulkUpdating`/`bulkUpdateError`
- `src/Components/Sectors/Market/Warehouse/components/BulkEditModal.jsx`, `BulkActionsBar.jsx` — UI массового изменения (маркет)
- `src/Components/Deposits/Sklad/hooks/useBulkUpdate.js`, `components/modals/BulkEditModal.jsx` — то же для склада barbershop/стройки

**Бэкенд-доки:**
- [sales-search-by-barcode-backend.md](../backend/kassa/sales-search-by-barcode-backend.md)
- [alternate-barcodes.md](../backend/alternate-barcodes.md)
- [bulk_update_products.md](../backend/bulk_update_products.md)

**Статус:**

| Компонент | Статус |
|-----------|--------|
| Поиск продаж по `barcode` | ⛔ **Бэк не реализован** — параметр не поддержан, фронт готов |
| `alternate_barcodes` — сохранение и отдача поля | ✅ Работает (список/карточка отдают, форма сохраняет) |
| `alternate_barcodes` — скан/поиск по доп. коду | ⛔ **Бэк не реализован** — скан и barcode-эндпоинты ищут только по основному `barcode`; на фронте временный фолбэк |
| Массовое изменение товаров (`bulk-update`) | ⛔ **Эндпоинта нет** — фронт готов, временный fallback на N последовательных PATCH |

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <accessToken>`. TZ: **Asia/Bishkek (UTC+6)**.

---

## Содержание

1. [Поиск продаж по штрихкоду](#1-поиск-продаж-по-штрихкоду)
2. [Дополнительные штрихкоды (alternate_barcodes)](#2-дополнительные-штрихкоды-alternate_barcodes)
3. [Массовое изменение товаров (bulk-update)](#3-массовое-изменение-товаров-bulk-update)
4. [Чеклист Flutter](#4-чеклист-flutter)

---

## 1. Поиск продаж по штрихкоду

**Статус: ⛔ запрошено, бэк не реализован.** Параметр `barcode` пока не поддержан
`GET /main/pos/sales/` — если отправить его сейчас, DRF молча проигнорирует незнакомый
query-параметр и вернёт список **без фильтрации** (весь список, а не совпавшее). Это
единственный риск: пользователь может не заметить, что фильтр не сработал.

```http
GET /main/pos/sales/?status=&start=&end=&consultant=&barcode=4601234567890
```

| Параметр | Тип | Обяз. | Семантика (запрошенная) |
|----------|-----|-------|--------------------------|
| `barcode` | string | нет | **Точное совпадение** (`==`), не `contains`. Ищет по строке чека (`SaleItem`), у которой совпал основной штрихкод (`barcode_snapshot`/`product.barcode`) **или** один из `alternate_barcodes`. Остальные фильтры (`status`, `start`, `end`, `consultant`) — AND, как сейчас. Пустое значение — параметр не отправлять. |

Бэк должен триммить пробелы по краям перед сравнением (случайный ввод/скан).

Желательное (не блокирующее) поле в каждом элементе списка — `matched_item_name`: название
позиции чека, совпавшей по штрихкоду (если совпадений несколько — первая). Возвращается
только когда `barcode` передан в запросе:

```json
{
  "id": "uuid",
  "created_at": "2026-09-11T10:20:00+06:00",
  "status": "paid",
  "total": "450.00",
  "matched_item_name": "Молоко 1 л"
}
```

Без `matched_item_name` фильтр всё равно работает — просто в UI не будет колонки с конкретной
позицией, кассиру нужно открыть чек и посмотреть список товаров.

```dart
class SalesHistoryFilters {
  String? status;
  DateTime? start;
  DateTime? end;
  String? consultantId;
  String? barcode; // debounce ~400мс на вводе

  Map<String, dynamic> toQuery() {
    final q = <String, dynamic>{};
    if (status != null) q['status'] = status;
    if (start != null) q['start'] = start!.toIso8601String();
    if (end != null) q['end'] = end!.toIso8601String();
    if (consultantId != null) q['consultant'] = consultantId;
    final b = barcode?.trim();
    if (b != null && b.isNotEmpty) q['barcode'] = b;
    return q;
  }
}
```

Несуществующий штрихкод → `200`, `results: []`, не `404`.

**До выката бэка:** не полагаться на фильтрацию по `barcode` — либо скрыть поле поиска по
штрихкоду в истории продаж на Flutter, либо явно предупредить, что результат может не быть
отфильтрован (сверять локально по загруженной странице, если это приемлемо по объёму данных).

---

## 2. Дополнительные штрихкоды (alternate_barcodes)

**Статус: смешанный.** Поле `alternate_barcodes` (массив строк) **сохраняется и отдаётся**
корректно уже сейчас. Но **поиск/скан по дополнительному коду не работает** ни в одном из
барcode-эндпоинтов — это отдельный незакрытый бэкенд-тикет.

### 2.1 Форма/шейп поля

```json
{
  "id": "uuid",
  "name": "Молоко 1 л",
  "barcode": "0460123456789",
  "alternate_barcodes": ["4870204391234", "4870204399999"]
}
```

- `alternate_barcodes` — массив строк, **всегда присутствует** (даже пустым `[]`) в
  `GET /main/products/list/`, `GET /main/products/{id}/`, ответах `warehouse-barcode`/`global-barcode`.
- Добавление/удаление — через **обычные** create/update эндпоинты товара, отдельного
  эндпоинта под алиас-коды нет:

```http
POST  /main/products/create-manual/
PATCH /main/products/{id}/
```

```json
{ "alternate_barcodes": ["4870204391234", "4870204399999"] }
```

Валидация при сохранении (со стороны бэка): дубли внутри массива схлопываются; код,
совпадающий с собственным `barcode` товара, отбрасывается.

### 2.2 Что уже работает (подтверждено)

| Место | Статус |
|-------|--------|
| Сохранение через `POST create-manual` / `PATCH {id}/` | ✅ работает |
| Отдача поля в списке и карточке | ✅ работает, всегда массив (не `null`) |
| Печать штрихкодов (`/crm/barcodes`) | ✅ исправлено на фронте, бэк не нужен — можно выбрать, какой код печатать (основной/доп.) |

### 2.3 Что НЕ работает (требуется бэк)

| Эндпоинт | Текущее поведение | Требуемое поведение |
|----------|--------------------|-----------------------|
| `POST /main/pos/sales/{sale_id}/scan/` | Ищет только по `barcode` → скан доп. кода даёт «не найден» | Искать по `{barcode} ∪ alternate_barcodes` в пределах компании |
| `GET /main/products/warehouse-barcode/{code}/` | Только `barcode`, доп. код → `404` | Искать по обоим |
| `GET /main/products/global-barcode/{code}/` | Только `barcode`, доп. код → `404` | Искать по обоим |
| `GET /main/products/list/?search=<код>` | `icontains` по `name`/`barcode`/`article`, не смотрит `alternate_barcodes` | Добавить `alternate_barcodes` в поля поиска |

**Неоднозначность при скане.** Если код совпадает у нескольких товаров (по описанию
контракта — этот случай уже реализован на бэке и фронте): `409` с телом

```json
{ "ambiguous": true, "message": "...", "matches": [{ "id": "uuid", "name": "Товар А" }] }
```

Flutter должен показать модалку выбора товара (аналог веб `BarcodeAmbiguityModal`).

**Нормализация кодов (требуется от бэка, ещё не сделано для поиска):**
1. Trim пробелов по краям.
2. Сравнение строковое, не числовое (ведущие нули значимы).
3. Рекомендуется EAN-13-нормализация: код на 13 цифр с ведущим `0` должен матчиться со сканом
   на 12 цифр без него, и наоборот.

**Уникальность.** Совпадение доп. кода с другим товаром **не запрещено жёстко** на уровне
БД — компания может иметь два товара с одинаковым заводским кодом; в этом случае скан должен
вернуть `409 ambiguous`, а не выбрать первый попавшийся товар. Если бэк решит запретить дубли
на уровне валидации — вернёт `400` с `detail`, который нужно показать как есть. Уникальность
всегда **в пределах компании**, не глобальная.

### 2.4 Временный фолбэк на Flutter (пока бэк не готов)

Веб уже реализовал этот фолбэк — воспроизвести аналогично на Flutter, чтобы доп. коды хоть
как-то работали в кассе/на складе до выката бэка:

1. Если `/scan/` (или `warehouse-barcode`/`global-barcode`) отвечает «не найден» (`404` или
   текст с «не найден») — искать товар вручную:
   - сначала в уже загруженной странице каталога (сверка `barcode ∪ alternate_barcodes` на клиенте);
   - затем через `GET /main/products/list/?search=<код>`.
2. Если найден — добавить в корзину/показать как обычно.
3. Ошибки другого рода (нет открытой смены, нет остатка, `409 ambiguous`) фолбэк **не**
   должен перехватывать — только «не найден».

```dart
Future<Product?> scanWithFallback(String rawCode, ProductRepository repo) async {
  final code = rawCode.trim();
  try {
    return await repo.scanBarcode(code); // POST .../scan/
  } on NotFoundException {
    // 1. В уже загруженном каталоге
    final local = repo.cachedProducts.firstWhereOrNull(
      (p) => p.barcode == code || p.alternateBarcodes.contains(code),
    );
    if (local != null) return local;

    // 2. Через search — временно, лишний запрос на каждый непонятый скан
    final results = await repo.searchProducts(code);
    return results.firstWhereOrNull(
      (p) => p.barcode == code || p.alternateBarcodes.contains(code),
    );
  }
  // Другие ошибки (нет смены, нет остатка, ambiguous) — пробрасывать как есть.
}
```

Ограничения фолбэка: требует, чтобы `?search=<код>` уже возвращал товар по доп. коду (сейчас
тоже не работает, см. §2.3 — фолбэк реально заработает только частично, пока не будет
исправлен `search`); лишний запрос на каждый непонятый скан; не даёт серверной проверки
неоднозначности и обходит серверную логику скана (весовые коды, PLU). После правок на бэке
фолбэк можно оставить как страховку — удалять не обязательно.

---

## 3. Массовое изменение товаров (bulk-update)

**Статус: ⛔ эндпоинта нет.** Фронт готов и ждёт `PATCH /main/products/bulk-update/`; пока
его нет — временный fallback на N последовательных `PATCH /main/products/{id}/` (медленно,
**не атомарно**).

### 3.1 Назначение

Массово меняет у списка товаров **только** справочные привязки: бренд, категорию,
поставщика. Остальные поля товара (цена, количество, штрихкод, PLU и т.д.) не затрагиваются.

### 3.2 Запрос

```http
PATCH /main/products/bulk-update/
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "ids": ["0f5d0c9a-1f0b-4a5e-9c11-2b3d4e5f6a7b", "1a2b3c4d-5e6f-4711-8899-aabbccddeeff"],
  "brand_name": "Coca-Cola",
  "category_name": "Напитки",
  "client": "9c8b7a65-4321-4def-9876-0123456789ab",
  "require_all": false
}
```

| Поле | Тип | Обяз. | Описание |
|------|-----|-------|----------|
| `ids` | array[uuid] | да | Мин. 1, **макс. 1000** за запрос. Дубликаты схлопываются на бэке. |
| `brand_name` | string \| null | нет | Новый бренд **по имени** (не id). `null` — очистить поле. Алиас `brand` — строка = имя, UUID = id. |
| `category_name` | string \| null | нет | Новая категория **по имени**. `null` — очистить. Алиас `category` — так же. |
| `client` | uuid \| null | нет | Новый поставщик (`main/clients/` с `type=suppliers`). `null` — очистить. |
| `require_all` | bool | нет | По умолчанию `false`. См. §3.3. |

**Критично для Flutter-модели запроса:** отсутствие ключа в JSON и `null` — **разные вещи**.
Ключа нет → бэк не трогает поле. `null` → бэк очищает поле. Значит, при сборке запроса нельзя
сериализовать все поля формы всегда — включать в тело нужно **только реально изменённые**
пользователем поля (или явно отмеченные к очистке).

Минимум одно из `brand_name`/`category_name`/`client` обязано присутствовать — иначе `400`.
Любые другие поля товара в теле бэк молча игнорирует (не `400`).

```dart
class BulkEditRequest {
  final List<String> ids;
  final _FieldValue<String?>? brand; // null внутри = "очистить", отсутствие = "не менять"
  final _FieldValue<String?>? category;
  final _FieldValue<String?>? clientId;
  final bool requireAll;

  BulkEditRequest({
    required this.ids,
    this.brand,
    this.category,
    this.clientId,
    this.requireAll = false,
  });

  Map<String, dynamic> toJson() {
    final body = <String, dynamic>{'ids': ids, 'require_all': requireAll};
    if (brand != null) body['brand_name'] = brand!.value;
    if (category != null) body['category_name'] = category!.value;
    if (clientId != null) body['client'] = clientId!.value;
    return body;
  }
}

/// Обёртка, чтобы отличить "поле не задано" от "поле = null" (очистка).
class _FieldValue<T> {
  final T value;
  const _FieldValue(this.value);
}
```

### 3.3 Семантика `require_all`

| Значение | Поведение |
|----------|-----------|
| `false` (по умолчанию) | Обновляются все доступные товары из `ids`; недоступные попадают в `skipped`, ответ всё равно `200`. |
| `true` | Если хотя бы один ID недоступен/не найден — **ничего** не обновляется, `400` со списком проблемных ID. |

### 3.4 Атомарность и ответ — частичный успех

**Не all-or-nothing по умолчанию.** При `require_all=false` бэк обновляет то, что может, и
возвращает список сбоев по каждому ID — Flutter должен рендерить результат построчно.
Атомарной (всё-или-ничего, одна транзакция) операция становится только при `require_all=true`
или при ошибке валидации/прав (тогда не меняется вообще ничего).

Ответ `200 OK`:

```json
{
  "updated": 12,
  "failed": 0,
  "requested": 14,
  "updated_ids": ["0f5d0c9a-…", "1a2b3c4d-…"],
  "skipped": [
    { "id": "aaaaaaaa-…", "reason": "not_found" },
    { "id": "bbbbbbbb-…", "reason": "forbidden" }
  ],
  "applied": {
    "brand": { "id": "…", "name": "Coca-Cola" },
    "category": { "id": "…", "name": "Напитки" },
    "client": { "id": "…", "full_name": "ОсОО Ромашка" }
  }
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `updated` | int | Сколько товаров реально обновлено |
| `failed` | int | Сколько не обновлено (= `skipped.length`) |
| `requested` | int | Сколько уникальных ID пришло |
| `updated_ids` | array[uuid] | ID успешно обновлённых |
| `skipped` | array[object] | `{ id, reason }`, `reason` ∈ `not_found` \| `forbidden` \| `other_branch` \| `deleted` |
| `applied` | object | Что именно было применено — для сверки в UI |

```dart
class BulkUpdateResult {
  final int updated;
  final int failed;
  final int requested;
  final List<String> updatedIds;
  final List<BulkSkipItem> skipped;
  final Map<String, dynamic> applied;

  factory BulkUpdateResult.fromJson(Map<String, dynamic> j) => BulkUpdateResult(
        updated: j['updated'] as int,
        failed: j['failed'] as int,
        requested: j['requested'] as int,
        updatedIds: List<String>.from(j['updated_ids'] ?? const []),
        skipped: (j['skipped'] as List? ?? const [])
            .map((e) => BulkSkipItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        applied: Map<String, dynamic>.from(j['applied'] ?? const {}),
      );
}

enum SkipReason { notFound, forbidden, otherBranch, deleted, unknown }

class BulkSkipItem {
  final String id;
  final SkipReason reason;

  factory BulkSkipItem.fromJson(Map<String, dynamic> j) => BulkSkipItem(
        id: j['id'] as String,
        reason: _parseReason(j['reason'] as String?),
      );
}

/// UI: показать "Обновлено товаров: N, не удалось: M" при failed > 0.
String buildResultMessage(BulkUpdateResult r) => r.failed > 0
    ? 'Обновлено товаров: ${r.updated}, не удалось: ${r.failed}'
    : 'Выбранные товары обновлены';
```

После успешного ответа (`updated > 0`) Flutter должен перезапросить
`GET /main/products/list/` с текущей страницей/поиском/фильтрами — ответ bulk-update **не**
обязан содержать сами обновлённые товары.

### 3.5 Разрешение бренда/категории/поставщика (со стороны бэка)

1. Значение парсится как UUID → ищем по `id` в пределах компании.
2. Иначе — по `name` (регистронезависимо, с обрезкой пробелов) в пределах компании.
3. Не нашли → `400`, **новый бренд/категория не создаются на лету** — их создание идёт
   отдельно через `POST /main/brands/` / `POST /main/categories/`.
4. `client` — только UUID, должен принадлежать компании и иметь `type=suppliers`, иначе `400`.

### 3.6 Ошибки

| Код | Когда | Тело |
|-----|-------|------|
| `400` | Пустой `ids`, невалидный UUID, не передано ни одного изменяемого поля, `require_all=true` и есть проблемные ID | `{ "detail": "…", "ids": ["…"] }` |
| `400` | Бренд/категория/поставщик не найдены | `{ "detail": "Бренд «Coca-Cola» не найден" }` |
| `401` | Нет/протух токен | стандартный DRF |
| `403` | Роль без права редактировать товары | `{ "detail": "Недостаточно прав" }` |
| `413`/`400` | `len(ids) > 1000` | `{ "detail": "За один запрос можно изменить не более 1000 товаров" }` |

Текст `detail` — на русском, показывать пользователю как есть.

### 3.7 Лимиты

- **Максимум 1000 ID за один запрос.** При превышении — `400`/`413`.
- Права те же, что у `PATCH /main/products/{id}/` — без права редактирования товаров
  весь запрос `403`, частичного исполнения нет.
- Изоляция: чужая компания → `skipped.reason = "forbidden"`; при ограничении по филиалу
  (не owner/admin) — товары другого филиала → `reason: "other_branch"`; soft-deleted товары →
  `reason: "deleted"`.

### 3.8 Fallback на Flutter (до выката бэка)

Как и на вебе — если `PATCH /main/products/bulk-update/` отвечает `404`/`405`, переключиться
на последовательные `PATCH /main/products/{id}/` по каждому ID из выбора. **Явно предупредить
пользователя** (или показать прогресс), что операция небыстрая и не атомарная — при обрыве
сети часть товаров может остаться неизменной. Убрать этот fallback можно только после
подтверждённого релиза `bulk-update/` на бэке.

---

## 4. Чеклист Flutter

### Поиск продаж по штрихкоду (§1)

- [ ] Параметр `barcode` добавлять в `GET /main/pos/sales/` только при непустом значении, с debounce ~400мс
- [ ] Не полагаться на серверную фильтрацию, пока бэк не подтвердит реализацию — предусмотреть индикатор/предупреждение при неработающем фильтре
- [ ] `matched_item_name` — опциональное поле, UI должен корректно работать при его отсутствии
- [ ] Пустой результат — это `results: []`, не ошибка

### Дополнительные штрихкоды (§2)

- [ ] `alternate_barcodes` — парсить как массив строк (может быть пустым, но не `null`) из списка/карточки/global-barcode/warehouse-barcode
- [ ] Сохранение доп. кодов — через `create-manual`/`PATCH {id}/`, без отдельного эндпоинта
- [ ] Локально схлопывать дубли и не давать сохранить код, совпадающий с собственным `barcode` (подстраховка, бэк тоже это делает)
- [ ] Скан/поиск по доп. коду — реализовать временный клиентский фолбэк (§2.4), пока бэк не чинит `/scan/`, `warehouse-barcode`, `global-barcode`, `search`
- [ ] `409 ambiguous` при скане — показывать модалку выбора товара из `matches[]`
- [ ] Фолбэк не должен перехватывать ошибки кроме «не найден» (не трогать «нет смены», «нет остатка», `ambiguous`)

### Массовое изменение товаров (§3)

- [ ] Отправлять в теле только реально изменённые поля — различать «не менять» (ключа нет) и «очистить» (`null`)
- [ ] Максимум 1000 ID за запрос — разбивать выбор на чанки на клиенте, если пользователь выбрал больше
- [ ] `require_all` — по умолчанию `false`; предложить пользователю переключатель «строго все или ничего» опционально
- [ ] Рендерить частичный результат: `updated`/`failed`/`skipped[]` — построчный список ошибок с `reason`, не просто «успех/провал»
- [ ] После успеха — перезапросить список товаров с текущими фильтрами, не полагаться на тело ответа
- [ ] Fallback на N×PATCH при `404`/`405` — с явным индикатором прогресса и предупреждением о неатомарности
- [ ] `403` — весь запрос целиком отклонён, не путать с `skipped.reason=forbidden` (это про отдельные товары чужой компании/филиала)

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [products-catalog.md](./products-catalog.md) | Список товаров, фильтры, базовые штрихкод-эндпоинты, весы/PLU |
| [add-product.md](./add-product.md) | Создание/редактирование товара (форма, `alternate_barcodes` в форме) |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Кассы, cashflows, смены — денежная сторона POS |
