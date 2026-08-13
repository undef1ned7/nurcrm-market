# Flutter: доработки NurCRM Market (август 2026)

Индекс: [README.md](./README.md).  
Бэкенд-контракт: [tz-aug-2026-backend.md](../backend/tz-aug-2026-backend.md).  
ТЗ веба: [`../market/tz-aug-2026-detailed.md`](../market/tz-aug-2026-detailed.md).

Базовый префикс: `{host}/api` + `/main/...`, `/warehouse/...`, `/users/...`.  
**Не** `/api/v1/`. Авторизация: `Bearer <accessToken>`.

Этот документ — что реализовать на Flutter по модулям ТЗ, с API и клиентскими fallback.

---

## Статус модулей

| # | Модуль | Веб | Flutter | Нужен BE |
|---|--------|-----|---------|----------|
| 5 | Денежный ящик ESC/POS | Готово (local + WebUSB) | Настройки + команда принтеру | Нет |
| 3 | Второй экран покупателя | BroadcastChannel | Отдельный экран / канал | Опционально фаза 2 |
| 2 | Центр уведомлений | Бейдж, вкладки, CTA, DELETE | То же | **Да** (категории, тариф 7/3/1, DELETE) |
| 4 | F3 + 0..9 | localStorage вариант A | То же | Желательно слоты на компанию |
| 1 | Массовое сканирование | UI + fallback lookup | То же | **Да** (`barcode-check`, `mass-incoming`) |
| 6 | Товар 18+ | Чекбокс, касса, 2-й экран | См. [adult-products.md](./adult-products.md) | **Да** (`is_adult`) |

---

## Модуль 1. Массовое добавление на склад

Точка входа: `/crm/sklad/mass-scan` (веб). Flutter: экран mass-scan склада.

Поток:

1. Сначала новые endpoints ниже.
2. Если `404/405/501` — классификация через  
   `GET /main/products/warehouse-barcode/{code}/` и  
   `GET /main/products/global-barcode/{code}/` (+ alternate barcodes).
3. **Проведение прихода без `mass-incoming` не делать** (риск частичного успеха). Показать «нужен endpoint».

### 1.1 Проверка штрихкода

```http
GET /warehouse/{warehouse_id}/barcode-check/{code}/
```

`{code}` — URL-encoded. Поиск: `barcode ∪ alternate_barcodes`.

**200**

```json
{
  "status": "IN_STOCK",
  "barcode": "4601234567890",
  "product": {
    "id": "uuid",
    "name": "Чай зелёный",
    "barcode": "4601234567890",
    "unit": "шт",
    "stock_qty": 12.0
  },
  "ambiguous": false,
  "matches": []
}
```

| `status` | Смысл |
|----------|--------|
| `IN_STOCK` | Есть на **этом** складе |
| `IN_CATALOG` | В каталоге компании, не на текущем складе |
| `UNKNOWN` | Не найден |

Неоднозначность: **409** + `matches[]` **или** `200` + `ambiguous: true`. Один UX: выбор из списка.

### 1.2 Атомарный приход

```http
POST /warehouse/{warehouse_id}/mass-incoming/
```

```json
{
  "items": [
    { "product_id": "uuid", "quantity": "10", "list": "IN_STOCK" },
    { "product_id": "uuid", "quantity": "3", "list": "IN_CATALOG" }
  ],
  "comment": "Массовое сканирование"
}
```

- Одна транзакция: всё или ничего.
- `IN_CATALOG` должен оприходовать на текущий склад.
- `quantity` — decimal-строка.
- Ошибка → остатки не менять частично.
- UI: три списка (на складе / в каталоге / неизвестные) + звуки скана (как веб `scanSounds`).

### 1.3 Создание карточки

Уже есть `POST /main/products/create-by-barcode/` и  
`POST /warehouse/{warehouse_id}/products/scan/`.

Тело: `{ barcode, name, price?, warehouse? }`. После create товар должен находиться как минимум `IN_CATALOG`.

---

## Модуль 2. Уведомления

Уже есть на API:

- `GET /main/notifications/`
- `POST /main/notifications/{id}/read/`
- `POST /main/notifications/mark-all-read/`
- WebSocket `/ws/notifications/?token=...`
- `unread_count`

### Модель

| Поле | Тип | Обяз. |
|------|-----|-------|
| `id` | uuid | да |
| `category` | `tariff` \| `system` \| `news` \| `other` | да |
| `title` | string | да |
| `body` | string | да |
| `is_read` | bool | да |
| `created_at` | datetime | да |
| `cta_url` | string | нет |
| `cta_label` | string | нет |
| `meta` | object | нет (`days_left` для тарифа) |

Алиасы `type`/`kind`: `subscription`, `maintenance`, `promo` → маппить в category (веб: `notificationCategory.ts`).

### API для клиента

```http
GET    /main/notifications/?category=&is_read=&limit=&offset=
POST   /main/notifications/{id}/read/
POST   /main/notifications/mark-all-read/   // опц. ?category=
DELETE /main/notifications/{id}/
```

UI:

- Бейдж из `unread_count` (REST + WS).
- Вкладки по category («Все» = без фильтра).
- CTA «Продлить» для tariff.
- Локальный тарифный алерт по `company.end_date` (7/3/1) **не подменяет** серверные записи эвристикой по тексту — только дополняет, пока бэк не шлёт джобы.

---

## Модуль 3. Второй экран покупателя

MVP: локальный канал между кассой и экраном покупателя.

Веб: `BroadcastChannel('nur-market-customer-display')`.  
Flutter: MethodChannel / отдельный route на 2-м дисплее / companion app + local IPC.

Типы сообщений (как веб `customer-display`):

- корзина / итог;
- `age-check` / `age-check-dismiss` (см. [adult-products.md](./adult-products.md)).

Backend **не нужен** для MVP.

Фаза 2 (если нужна общая настройка сети):

```http
GET/PUT /main/pos/customer-display/
{
  "enabled": true,
  "welcome_text": "Добро пожаловать в …",
  "slides": [{ "image_url": "https://…", "caption": "Акция" }]
}
```

QR на оплату — только с платёжной интеграцией. Сейчас не показывать.

---

## Модуль 4. Быстрые слоты F3 + 0..9

Продуктовый гейт: **вариант A**.

- `F1, F2, F4–F12` — по-прежнему группа `hotkey_group`.
- Одиночный `F3` на кассе **не** открывает группу: 2 секунды ждёт цифру `0–9` и добавляет слот в чек.
- Если открыта модалка групп, `F3` переключает вкладку F3.

Слоты MVP: локальное хранилище `market_f3_slots_{companyId}`.

```dart
/// Ключи "0".."9" → productId или null
typedef QuickSlots = Map<String, String?>;
```

Фаза 2 — общие слоты:

```http
GET /main/pos/quick-slots/
PUT /main/pos/quick-slots/
```

```json
{
  "0": "product-uuid-or-null",
  "1": "…",
  "9": null
}
```

Права: owner/admin или `can_edit_pos`. Сосуществование с `hotkey_group` обязательно.

UI настройки слотов: модалка как веб `QuickSlotsModal`.

---

## Модуль 5. Денежный ящик

Только клиент. Настройки печати / ESC/POS.

Ключи (веб): `escpos_drawer_*`.  
Команда по умолчанию: `27, 112, 0, 25, 250` (`ESC p`).

На Flutter: отправить байты на принтер через уже используемый ESC/POS канал (USB / Bluetooth / network). Backend не требуется.

---

## Модуль 6. Товар 18+

Подробно: [adult-products.md](./adult-products.md).

Кратко:

- чекбокс на карточке → `is_adult` в create/PATCH;
- на кассе диалог при первом добавлении;
- второй экран: «Вам есть 18?» до подтверждения;
- fallback id в local store, пока API не отдаёт поле;
- `add-item` / `scan` **не** блокировать на сервере.

---

## Связанные доки Flutter (тот же релиз)

- [cashier-settings.md](./cashier-settings.md)
- [debt-installment-schedule.md](./debt-installment-schedule.md)
- [product-form-layout.md](./product-form-layout.md)
- [procurement-recommendations.md](./procurement-recommendations.md)
- [procurement-history-returns.md](./procurement-history-returns.md)
- [receipt-price-edit-discount.md](./receipt-price-edit-discount.md)

---

## Чеклист Flutter

- [ ] Mass-scan: barcode-check + UI трёх списков
- [ ] Mass-incoming all-or-nothing; без endpoint — ошибка, не частичный PATCH
- [ ] Уведомления: category, вкладки, DELETE, CTA, unread badge + WS
- [ ] F3+0..9 слоты + local persist; группы F1–F12 не ломать
- [ ] Денежный ящик ESC p
- [ ] Второй экран: корзина + age-check
- [ ] `is_adult` на товаре и кассе
- [ ] Ошибки: `{ "detail" }` / `{ "message" }` на русском в тостах
