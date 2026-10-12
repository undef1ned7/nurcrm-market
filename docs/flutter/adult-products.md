# Flutter: товар 18+

Документ для мобильного клиента NurCRM Market. Повторяет поведение веб-фронта: флаг на карточке товара, проверка возраста на кассе, оверлей на втором экране покупателя.

**Веб-экраны:** карточка товара + `/crm/market/cashier` + второй экран  
**Веб-код:** `src/entities/product/lib/isAdultProduct.ts`, `src/features/customer-display/`  
**Бэкенд-док:** [adult-products-backend.md](../backend/adult-products-backend.md)

**Статус:** веб готов. Пока API не отдаёт `is_adult`, веб держит флаг в `localStorage` (`market_adult_products_{companyId}`). Это fallback одной кассы, без синхронизации между устройствами.

Второй экран покупателя — только клиент (у веб: `BroadcastChannel`). Backend для 18+ **не нужен**.

---

## 1. Purpose

Администратор помечает товар как **18+** (алкоголь, табак и т.п.).

На кассе при **первом** добавлении такой позиции в чек:

1. Кассир видит уведомление: «Этот товар предназначен для совершеннолетних».
2. Если открыт второй экран — покупатель видит «Вам есть 18?».
3. Кассир нажимает «Подтвердить» → надпись на втором экране пропадает, товар остаётся в чеке.

Повторное увеличение количества той же позиции в том же чеке **не** спрашивает возраст снова.

Backend **не** блокирует `add-item` / `scan` по возрасту и **не** требует флага `age_confirmed`.

---

## 2. Модель и поле API

| Поле | Тип | Default | Обязательно |
|------|-----|---------|-------------|
| `is_adult` | `bool` | `false` | нет |

Алиас: `is_18_plus`. Каноническое имя — **`is_adult`**.

Правила:

- Только `kind=product`. Для услуги/комплекта всегда `false`.
- `null` не использовать; только `true` / `false`.
- На create/PATCH: если поле не передано — не затирать (частичный PATCH).

### Парсинг (Dart)

```dart
bool parseIsAdult(Map<String, dynamic> json) {
  final v = json['is_adult'] ?? json['is_18_plus'];
  if (v == true || v == 1 || v == '1' || v == 'true') return true;
  if (v == false || v == 0 || v == '0' || v == 'false') return false;
  return false; // неизвестно → не 18+
}
```

Явный `true`/`false` из API **побеждает** локальный кэш.

---

## 3. Где читать / писать поле

### Читать обязательно

| Метод | Путь | Зачем |
|---|---|---|
| `GET` | `/main/products/list/` | каталог склада и кассы |
| `GET` | `/main/products/{id}/` | редактирование |
| `POST` | `/main/products/create-manual/` | эхо после создания |
| `PATCH` | `/main/products/{id}/` | эхо после правки |
| `POST` | `/main/products/create-by-barcode/` | скан-create |
| `POST` | `/warehouse/{uuid}/products/scan/` | складской скан |
| `POST` | `/main/pos/sales/{id}/scan/` | скан на кассе (в product/item) |
| ambiguous `matches[]` | — | каждый match: `id`, `name`, **`is_adult`** |

### Желательно

- `GET /main/products/global-barcode/{code}/`
- `GET /main/products/warehouse-barcode/{code}/`
- `GET /warehouse/{id}/barcode-check/{code}/`

### Писать

`POST /main/products/create-manual/` и `PATCH /main/products/{id}/`:

```json
{
  "name": "Вино красное 0.75",
  "is_adult": true
}
```

`POST /main/products/create-by-barcode/`:

```json
{
  "barcode": "4601234567890",
  "name": "Пиво",
  "is_adult": true
}
```

---

## 4. UI: карточка товара

- Чекбокс / свитч **«Товар 18+»** только для `kind=product`.
- Для услуги и комплекта — скрыть, в API слать `false` или не слать.
- Блок формы id: `adult` (см. [product-form-layout.md](./product-form-layout.md)). Если блок скрыт в раскладке, но у товара уже `is_adult=true` — всё равно показать (чтобы не потерять флаг).

---

## 5. UI: касса

### Когда показывать диалог

При добавлении товара в чек (поиск, скан, быстрый слот, F-клавиша), если:

```text
isAdult(product) == true
И productId ещё не в «подтверждённых 18+» для текущего чека
```

После подтверждения добавить `productId` в `Set<String> ageConfirmedProductIds` текущего чека.  
При очистке / закрытии чека — сбросить set.

### Диалог кассира

- Текст: «Этот товар предназначен для совершеннолетних».
- Кнопки: «Подтвердить» / «Отмена».
- Отмена → товар **не** добавлять (или откатить, если уже добавили оптимистично).
- Подтвердить → оставить в чеке, закрыть оверлей второго экрана.

### Что не делать

- Не слать на бэк «age confirmed».
- Не писать push в центр уведомлений.
- Не блокировать повторное `+` по той же позиции.

---

## 6. Второй экран покупателя

MVP веба: `BroadcastChannel('nur-market-customer-display')`, типы `age-check` / `age-check-dismiss`.

На Flutter (второй дисплей / отдельный экран / companion):

| Событие | Когда | UI |
|---|---|---|
| `age-check` | кассир добавил 18+ и ждёт подтверждения | «Вам есть 18?» |
| `age-check-dismiss` | кассир подтвердил / отменил | убрать оверлей |

Канал между экранами — локальный (MethodChannel / shared stream / local socket). Backend не нужен.

---

## 7. Fallback без `is_adult` в API

Пока list/detail не отдают поле:

1. После успешного create/PATCH с `is_adult: true` — сохранить id в локальный кэш:

```text
ключ: market_adult_products_{companyId}
значение: JSON-массив id строк
```

2. При чтении товара:

```text
isAdult = parseIsAdult(apiJson)
         || localAdultIds.contains(productId)
```

3. Когда API начнёт отдавать явный `true`/`false` — **API побеждает** локальный кэш.

Это не замена API и не синхронизируется между устройствами.

---

## 8. Чеклист Flutter

- [ ] Чекбокс 18+ на create/edit товара (`kind=product`)
- [ ] `is_adult` в теле create-manual / PATCH / create-by-barcode
- [ ] Парсинг `is_adult` / `is_18_plus` из list, detail, scan, matches
- [ ] Диалог на кассе при первом добавлении 18+ в чек
- [ ] Повторный `+` той же позиции без повторного вопроса
- [ ] Оверлей на втором экране до подтверждения
- [ ] Fallback local cache, пока бэк не отдаёт поле
- [ ] Услуги/комплекты не помечаются 18+
