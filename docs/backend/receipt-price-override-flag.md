# Маркет — Чек: явный флаг ручной смены цены

**Эндпоинты:**
- `PATCH /main/pos/carts/{cart_id}/items/{item_id}/` — изменение строки (`unit_price` / скидка)
- `GET /main/sales/json/{sale_id}/receipt/` — JSON чека для печати
- ответ `POST /main/pos/sales/{id}/checkout/` (если там есть `items`)

**Статус:** ⚠️ Нужен бэкенд. Фронт держит временную эвристику `inferDiscountFromPriceDiff` (`src/pages/sell/ui/services/print/receiptDiscount.ts`).

Связано с [`receipt-price-edit-discount.md`](./receipt-price-edit-discount.md) (order-level `discount` ≠ ручная цена).

---

## 1. Проблема

Кассир меняет цену 250 → 230 **без скидки**. Если в JSON чека:

- `price` / `unit_price` остаётся каталожным (250), а `line_total` = 230, и
- `line_discount` = 0,

фронт вынужденно печатает разницу `250 − 230` как **скидку строки**. На бумаге покупатель видит «скидку», которой не было.

Обратный кейс — настоящая скидка без поля `line_discount` — как раз то, ради чего эвристика существует. Без явного сигнала бэка фронт **не может** отличить эти ситуации.

## 2. Что нужно от бэка

На **каждой позиции** чека (`items[]` в `/main/sales/json/{id}/receipt/` и в printable payload checkout) добавить одно из полей (достаточно одного контракта):

### Вариант A (предпочтительный)

```json
{
  "name": "Лемонад Kt",
  "qty": 1,
  "unit_price": 230.0,
  "line_discount": 0.0,
  "line_total": 230.0,
  "price_manually_edited": true
}
```

| Поле | Тип | Смысл |
|------|-----|--------|
| `price_manually_edited` | boolean | `true`, если кассир менял `unit_price` вручную; иначе `false` / отсутствует |

### Вариант B

```json
"price_override_reason": "manual" | "discount" | null
```

| Значение | Смысл |
|----------|--------|
| `"manual"` | ручная цена, **не** печатать gap как скидку |
| `"discount"` | разрыв — настоящая скидка |
| `null` / нет поля | поведение по умолчанию (явные поля скидки) |

### Дополнительно (желательно)

Держать `unit_price` / `price` = **фактическую** цену продажи (уже требуется в receipt-price-edit-discount.md). Тогда при корректном `line_total` эвристика сама не сработает.

## 3. Поведение фронта после появления поля

1. Если `price_manually_edited === true` или `price_override_reason === "manual"` → **не** вызывать `inferDiscountFromPriceDiff`.
2. Печатать только явный `line_discount` / `discount_total` / `line_discount_total`.
3. Эвристику оставить как fallback для старых ответов без флага.

Фронт уже читает эти имена полей (`isPriceManuallyEdited`).

## 4. Приёмка

| # | Действия | Ожидание в JSON | Ожидание на чеке |
|---|----------|-----------------|------------------|
| 1 | Цена 250→230, скидок нет | `unit_price: 230`, `line_discount: 0`, `price_manually_edited: true` | нет строки скидки, итог 230 |
| 2 | Цена 250, скидка строки 20 | `line_discount: 20`, флаг false/нет | скидка 20 |
| 3 | Старый клиент без флага | как сейчас | эвристика (документированный риск) |
