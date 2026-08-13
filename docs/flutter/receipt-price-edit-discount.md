# Flutter: чек — изменение цены ≠ скидка

**Веб-экран:** `/crm/market/cashier`  
**Эндпоинты:**
- `PATCH /main/pos/carts/{cart_id}/items/{item_id}/` — цена / скидка / кол-во
- `GET /main/sales/json/{sale_id}/receipt/` — JSON чека для печати

**Бэкенд-док:** [receipt-price-edit-discount.md](../backend/receipt-price-edit-discount.md)

**Статус:** ⚠️ На бэке баг: ручное изменение цены попадает в `discount` чека → скидка на печати вычитается второй раз. Flutter должен соблюдать контракт клиента и инвариант печати; если бэк ещё отдаёт лишний `discount` — см. §5.

---

## 1. Проблема

Кассир меняет цену 250 → 230 **без скидки**. Ошибочный чек:

```json
{
  "items": [
    { "name": "Лемонад Kt", "qty": 1.0, "price": 230.0,
      "line_discount": 0.0, "line_total": 230.0 }
  ],
  "discount": 20.0,
  "paid_cash": 230.0,
  "change": 0.0
}
```

Печать считает: `Итог = Подытог − discount` → 230 − 20 = **210**, хотя оплачено 230.

Корректный чек со скидкой:

```json
{
  "items": [
    { "name": "Лемонад Kt", "qty": 1.0, "price": 250.0,
      "line_discount": 10.0, "line_total": 240.0 }
  ],
  "discount": 20.0,
  "paid_cash": 230.0
}
```

Подытог = 240 + 10 = 250, Итог = 250 − 20 = 230 = `paid_cash`.

---

## 2. Две независимые операции на клиенте

**Никогда** не отправлять изменение цены как скидку.

| Действие кассира | Тело PATCH | Смысл |
|---|---|---|
| Изменил цену | `{ "unit_price": "230.00" }` | Новая цена продажи. Скидки нет. |
| Скидка на строку | `{ "discount_total": "10.00" }` | Скидка в сомах на позицию |
| Скидка на заказ | `{ "order_discount_total": "10.00" }` или `{ "order_discount_percent": 5 }` | Скидка на чек |

```dart
Future<void> patchCartItemPrice(String cartId, String itemId, String unitPrice);
Future<void> patchCartItemDiscount(String cartId, String itemId, String discountTotal);
// Не смешивать поля в одном запросе без нужды.
```

---

## 3. Правила контракта чека

1. Изменение `unit_price` **не** порождает скидку. Разница с каталогом — не `discount` / `line_discount`.
2. `price` в чеке = фактическая цена продажи (`unit_price` строки), не каталожная.
3. `line_discount` = только явная скидка через `discount_total`.
4. `discount` (уровень чека) = скидка на заказ + Σ построчных скидок.
5. `line_total` = `unit_price × qty − line_discount`.
6. Для аналитики отклонение от каталога — отдельное поле (`price_adjustment`), **не** в печатный `discount`.

Инвариант печати (обязан выполняться):

```text
Σ(line_total + line_discount) − discount + tax = сумма к оплате = Σ payments.amount
```

---

## 4. Приёмочные сценарии (ожидаемый JSON)

| # | Действия | Ожидание |
|---|---|---|
| 1 | Цена 250 → 230, скидок нет | `price: 230, line_discount: 0, line_total: 230, discount: 0`, итог 230 |
| 2 | Цена 250, скидка строки 10 | `price: 250, line_discount: 10, line_total: 240, discount: 10`, итог 240 |
| 3 | Скидка строки 10 + заказ 10 | `price: 250, line_discount: 10, line_total: 240, discount: 20`, итог 230 |
| 4 | Цена → 230, потом скидка строки 10 | `price: 230, line_discount: 10, line_total: 220, discount: 10`, итог 220 |

`paid_cash` / `payments` сходятся с итогом; `change` = `cash_received − итог`.

---

## 5. Печать и предпросмотр на Flutter

При построении чека из `GET …/receipt/`:

```dart
double computeReceiptTotal({
  required List<ReceiptItem> items,
  required double discount,
  double tax = 0,
}) {
  final subtotalGross = items.fold<double>(
    0,
    (s, i) => s + i.lineTotal + i.lineDiscount,
  );
  return subtotalGross - discount + tax;
}
```

Где это ломается, если бэк кривой:

- печать ESC/POS / PDF;
- предпросмотр чека;
- eKassa (поля скидок 1059/1031) — лишняя «скидка» даст расхождение с оплатой.

### Временный workaround (опционально)

Пока бэк не починен: если для всех строк `line_discount == 0`, а `discount > 0`, и `discount ≈ Σ(catalog_price − price) × qty`, можно **не** вычитать такой `discount` в превью — но это эвристика. Целевое решение — правка бэка. Не подменять `unit_price` скидкой на клиенте.

---

## 6. UI кассы

- Редактирование цены строки и скидки — **разные** поля / жесты.
- Лимит max discount (см. [cashier-settings.md](./cashier-settings.md)) применяется только к скидке, не к ручной цене.
- После PATCH цены обновить `unit_price` / `line_total` в UI из ответа корзины, не вычислять «скидку = каталог − новая цена».

---

## 7. Чеклист Flutter

- [ ] `patchCartItemPrice` шлёт только `unit_price`
- [ ] `patchCartItemDiscount` шлёт только `discount_total`
- [ ] Печать: инвариант `Σ(line_total + line_discount) − discount = к оплате`
- [ ] Предпросмотр совпадает с печатью
- [ ] Ручная цена не отображается как «Скидка» в UI строки
- [ ] Сценарии §4 проходят на стенде после фикса бэка
