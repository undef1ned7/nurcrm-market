# Flutter: настройки кассы

Код на удаление из корзины + максимальная скидка + версия отсрочки.

**Веб-экраны:**
- Настройки: `/crm/set` → вкладка **«Касса»**
- Касса: `/crm/market/cashier`

**Веб-код:** `src/features/create-sale/model/useMarketCashierSettings.ts`  
**Бэкенд-док:** [cashier-settings.md](../backend/cashier-settings.md)

**Статус:** веб готов «мягко». Пока эндпоинтов нет — GET падает, функции выключены (код не спрашивается, лимита скидки нет) + fallback на `company.cashier_password`. После появления API всё включается само.

---

## 1. Задача

Владелец/админ должен уметь:

1. **Код на удаление** из корзины (4–8 цифр). Пусто = код не нужен.
2. **Макс. % скидки.** Пусто/`null` = без ограничения. Кассир не может выставить больше — ни на строку, ни на чек.
3. **Версия отсрочки** `debt_schedule_version`: `"v1"` | `"v2"` (см. [debt-installment-schedule.md](./debt-installment-schedule.md)).

Существующее право `can_view_market_delete_cart_item` **не трогать**. Это полный запрет удаления. Код — второй слой:

```text
удаление разрешено, если:
  can_view_market_delete_cart_item (или owner/admin)
  И (код не задан ИЛИ код верный ИЛИ owner/admin)
```

Owner/admin код **не вводят**.

---

## 2. Эндпоинты

| Метод | Путь | Кто |
|---|---|---|
| `GET` | `/main/pos/cashier-settings/` | любой сотрудник компании |
| `PATCH` | `/main/pos/cashier-settings/` | только owner/admin |
| `POST` | `/main/pos/cashier-settings/verify-delete-code/` | любой сотрудник |

---

## 3. Модели (Dart)

```dart
class MarketCashierSettings {
  final String? id;
  final String? deleteItemCode;          // только owner/admin; может отсутствовать
  final bool deleteItemCodeRequired;
  final double? maxDiscountPercent;      // null = без лимита
  final String debtScheduleVersion;      // 'v1' | 'v2'
  final DateTime? updatedAt;
  final String? updatedBy;
}

MarketCashierSettings normalizeCashierSettings(Map<String, dynamic> json) {
  final required = json['delete_item_code_required'] ??
      json['delete_item_code_set'] ??
      false;
  final maxRaw = json['max_discount_percent'];
  final verRaw = json['debt_schedule_version'] ??
      json['deferred_schedule_version'];

  // Веб nur-market: нет поля → v2; явно v1 → классика.
  // Бэкенд default при отсутствии записи → v1.
  String version = 'v2';
  if (verRaw == 'v1' || verRaw == '1' || verRaw == 1) version = 'v1';
  if (verRaw == 'v2' || verRaw == '2' || verRaw == 2) version = 'v2';

  return MarketCashierSettings(
    id: json['id']?.toString(),
    deleteItemCode: json['delete_item_code']?.toString(),
    deleteItemCodeRequired: required == true,
    maxDiscountPercent: maxRaw == null ? null : double.tryParse('$maxRaw'),
    debtScheduleVersion: version,
    updatedAt: json['updated_at'] != null
        ? DateTime.tryParse(json['updated_at'].toString())
        : null,
    updatedBy: json['updated_by']?.toString(),
  );
}
```

---

## 4. Контракт ответов

### GET — owner/admin

```json
{
  "id": "0f0e6b4a-1f2b-4a2f-9f7a-9c9a3f11a1b2",
  "delete_item_code": "1234",
  "delete_item_code_required": true,
  "max_discount_percent": "10.00",
  "debt_schedule_version": "v2",
  "updated_at": "2026-07-31T12:04:11+06:00",
  "updated_by": "Иванов И."
}
```

### GET — кассир (код не раскрывать)

```json
{
  "delete_item_code_required": true,
  "max_discount_percent": "10.00",
  "debt_schedule_version": "v2"
}
```

### GET — ничего не настроено

```json
{
  "delete_item_code_required": false,
  "max_discount_percent": null,
  "debt_schedule_version": "v1"
}
```

Каноничный флаг: `delete_item_code_required`. Алиас: `delete_item_code_set`.

Если бэк хранит хеш и не отдаёт `delete_item_code` — поле в настройках пустое, факт «код задан» из `delete_item_code_required`.

### PATCH (owner/admin)

```json
{
  "delete_item_code": "1234",
  "max_discount_percent": "10",
  "debt_schedule_version": "v2"
}
```

Сброс:

```json
{
  "delete_item_code": null,
  "max_discount_percent": null
}
```

Валидация на клиенте до отправки:

| Поле | Правило |
|---|---|
| `delete_item_code` | только цифры, 4–8; `null`/`""` ок |
| `max_discount_percent` | `0 ≤ x ≤ 100`, до 2 знаков; `null` ок |
| `debt_schedule_version` | только `"v1"` / `"v2"` |

Ответ 200 → синхронизировать форму по ответу.

### verify-delete-code

```json
POST { "code": "1234" }
→ 200 { "valid": true }  или  { "valid": false }
```

- Неверный код → `valid: false` (не 400). Показать «Неверный код», очистить ввод, дать повторить.
- `400`/`403`/`429` → техошибка («Не удалось проверить код»).
- Если код в компании не задан — бэк вернёт `valid: true`.

**Не сверять код на клиенте** после появления API. Не логировать код.

---

## 5. Поведение на кассе

### Загрузка

На маунте кассы: `GET /main/pos/cashier-settings/`.

| Ответ | Поведение |
|---|---|
| 200 | применить настройки |
| 404/403/сеть | функции выключены + fallback: если `company.cashier_password` заполнен — спрашивать код и сверять **локально** (временный fallback) |
| 401/5xx | как ошибка сети / retry |

### Удаление (после проверки права)

Точки, где спрашивать код (если `deleteItemCodeRequired` и не owner/admin):

- удаление позиции;
- уменьшение количества до 0 (`−` или ввод `0`);
- удаление корзины целиком.

Модалка:

- ввод цифр, Enter — подтвердить, Esc/«Отмена» — отменить (позиция остаётся, qty восстанавливается);
- неверный код — сообщение в модалке, ввод очистить;
- пока модалка открыта — отключить глобальные хоткеи кассы (F1–F12, Enter → оплата, сканер).

Поток: `verify-delete-code` → при `valid: true` → обычный `DELETE`.

Если бэк перейдёт на вариант с заголовком `X-Delete-Code` — передать код в DELETE; пока веб использует отдельный verify.

### Скидка

При заданном `maxDiscountPercent` и роли не owner/admin:

- подпись поля строки: «Скидка (до N%)»;
- ввод больше лимита → обрезать до лимита + предупреждение «Максимальная скидка — N%. Установлено M сом»;
- то же в модалке общей скидки (сумма и процент), подсказка «Максимальная скидка: N%».

Формулы лимита (как на бэке):

```text
скидка_на_строку ≤ unit_price × quantity × max / 100
скидка_на_заказ ≤ subtotal × max / 100
order_discount_percent ≤ max
```

При `400` с `detail` от сервера — показать `detail` как есть. Не молча обрезать на сервере ожидание: кассир должен видеть лимит.

---

## 6. Экран настроек

- Вкладка «Касса» видна при секторе «Магазин» и роли `owner`/`admin`.
- Поле кода: цифры 4–8, кнопка «Убрать код».
- Поле скидки: 0–100 или пусто.
- Переключатель / select версии отсрочки: v1 / v2.
- После PATCH обновить локальный state из ответа.

Совместимость со старым `Company.cashier_password`:

- Пока GET cashier-settings недоступен — fallback на `cashier_password`.
- После появления API fallback не использовать.
- Не показывать код кассиру из `GET /users/company/` (бэк должен перестать отдавать поле не-owner).

---

## 7. Чеклист Flutter

- [ ] GET настроек на маунте кассы и экрана настроек
- [ ] normalize: `delete_item_code_required` / `_set`, `max_discount_percent`, `debt_schedule_version`
- [ ] PATCH только owner/admin, валидация 4–8 цифр и 0–100
- [ ] verify-delete-code перед удалением позиции/корзины
- [ ] Owner/admin без модалки кода
- [ ] Лимит скидки на строку и на заказ в UI
- [ ] Fallback на `cashier_password` только если GET settings недоступен
- [ ] Версия отсрочки влияет на UI оплаты (см. debt-док)
- [ ] 404/сеть → soft-disable без краша
