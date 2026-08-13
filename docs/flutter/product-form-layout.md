# Flutter: раскладка формы создания товара

**Веб-экран:** `/crm/sklad/add-product`  
**Веб-код:** `src/features/warehouse-ops/ui/AddProductPage/formLayout/`  
**Эндпоинты:**
- `GET /main/products/form-layout/`
- `PATCH /main/products/form-layout/` — только owner/admin

**Бэкенд-док:** [product-form-layout-backend.md](../backend/product-form-layout-backend.md)  
**Связанный Flutter-док:** [add-product.md](./add-product.md)

**Статус:** веб готов. При `404`/`405`/`501` — `localStorage` на устройстве. После API раскладка синхронизируется между устройствами.

---

## 1. Purpose

Форма товара перегружена. Владелец один раз скрывает ненужные блоки (как Control Center на iPhone).

- Раскладка **одна на компанию**, не на устройство.
- Скрытие — только UI; данные товара не удаляются.
- Если у сохранённого товара поле уже заполнено — блок всё равно показать (не потерять акцию / 18+ / фото).

---

## 2. Модель

```dart
class ProductFormLayout {
  final List<String> hidden;
  final DateTime? updatedAt;
}

/// Допустимые id блоков. Неизвестные — игнорировать.
const kFormBlockIds = {
  'code', 'barcode', 'alternateBarcodes', 'article', 'hotkey', 'images',
  'category', 'brand',
  'unit', 'pieceSale', 'weight', 'adult', 'packaging',
  'markup', 'wholesale', 'discount',
  'supplier', 'debt', 'minStock', 'country', 'expiry',
  'promotion', 'characteristics', 'description', 'plu',
};
```

`hidden: []` = полная форма.

**Нельзя прятать:** наименование, количество, цена закупки/продажи, тип товара, кнопки сохранить/отмена.

Новые id в будущих релизах **не** автодобавлять в `hidden` на клиенте.

---

## 3. API

Базовый префикс: `{host}/api`. Не `/api/v1/`.  
`Authorization: Bearer <accessToken>`.

### GET `/main/products/form-layout/`

Доступ: любой сотрудник компании.

```json
{
  "hidden": ["images", "characteristics", "expiry", "debt", "adult", "promotion"],
  "updated_at": "2026-08-11T15:40:00+06:00"
}
```

Нет записи → `200` `{ "hidden": [] }`.

### PATCH `/main/products/form-layout/`

Только `owner` / `admin`. Остальным — `403`.

```json
{ "hidden": ["images", "characteristics", "expiry"] }
```

| Правило | |
|---|---|
| `hidden` обязателен, массив | `null` не слать |
| неизвестный id | бэк отбросит; клиент тоже фильтровать |
| `[]` | сброс к полной форме |
| последний PATCH побеждает | без merge |

Ответ 200 → тот же объект, что GET (нормализованный). Синхронизировать UI и локальный кэш.

---

## 4. Поведение клиента (как на вебе)

1. На маунте читать локальный кэш `market_product_form_layout_{companyId}` — форма открывается сразу.
2. Параллельно `GET form-layout/`.
3. Успех → подменить кэш и UI.
4. `404`/`405`/`501` → остаться на кэше устройства, **без тоста**.
5. Owner/admin: «Настроить форму» → минус на блоках → «Добавить поле» / «Готово».
6. Каждое изменение и «Готово» → `PATCH`. Успех → local cache. Ошибка PATCH (кроме missing endpoint) → тост, локальный кэш **не** откатывать.
7. Кассир кнопку настройки не видит — только применяет GET.

### Показ блока

```dart
bool shouldShowBlock(String blockId, ProductFormLayout layout, bool hasValue) {
  if (hasValue) return true; // заполненное поле всегда видно
  return !layout.hidden.contains(blockId);
}
```

`hasBlockValue` — см. веб `hasBlockValue.ts` (для adult: `is_adult == true`, для images: есть файлы, и т.д.).

---

## 5. Чеклист Flutter

- [ ] GET на открытии add-product + local cache
- [ ] Soft ignore 404/405/501
- [ ] PATCH только owner/admin
- [ ] Фильтр unknown block ids
- [ ] Скрытые пустые блоки не рендерить; заполненные — показывать
- [ ] Кассир без кнопки «Настроить форму»
- [ ] Синхронизация между устройствами после появления API
