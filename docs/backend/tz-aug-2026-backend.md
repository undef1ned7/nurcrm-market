# Backend-контракт: доработки NurCRM Market (август 2026)

Индекс всех BE-доков: [`README.md`](./README.md). ТЗ фронта: [`../market/tz-aug-2026-detailed.md`](../market/tz-aug-2026-detailed.md).

Фронтенд уже реализован в `nur-market`. Этот документ — что нужно сделать на **NurCRM API**, чтобы модули заработали полностью.

Базовый префикс: `{host}/api` + пути `/main/...`, `/warehouse/...`, `/users/...`.  
**Не вводить `/api/v1/`**, пока фронт явно не мигрирует.

Авторизация: `Authorization: Bearer <accessToken>` (как остальные CRM-методы).

---

## Статус на фронте

| # | Модуль | FE | Нужен BE |
|---|--------|----|----------|
| 5 | Денежный ящик ESC/POS | Готово (localStorage + WebUSB) | Нет |
| 3 | Второй экран покупателя | Готово (BroadcastChannel) | Опционально (фаза 2) |
| 2 | Центр уведомлений | Бейдж, вкладки, CTA, попытка DELETE | **Да** (категории, тариф 7/3/1, DELETE) |
| 4 | F3 + 0..9 | Готово (localStorage, вариант A) | Желательно (слоты на компанию) |
| 1 | Массовое сканирование | UI + fallback lookup | **Да** (`barcode-check`, `mass-incoming`) |
| 6 | Товар 18+ | Чекбокс, касса, второй экран | **Да** (`is_adult` на Product) |

---

## Модуль 1. Массовое добавление на склад (обязательно)

Точка входа FE: `/crm/sklad/mass-scan`.

Сейчас FE:

1. Сначала бьёт в новые endpoints ниже.
2. Если `404/405/501` — классифицирует штрихкод через
   `GET /main/products/warehouse-barcode/{code}/` и
   `GET /main/products/global-barcode/{code}/` (+ alternate barcodes).
3. **Проведение прихода без `mass-incoming` не делается** (риск частичного успеха). UI покажет ошибку «нужен endpoint».

### 1.1 Проверка штрихкода

```
GET /warehouse/{warehouse_id}/barcode-check/{code}/
```

`{code}` — URL-encoded. Поиск по `barcode ∪ alternate_barcodes`.

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
| `IN_STOCK` | Товар есть на **этом** складе |
| `IN_CATALOG` | Товар есть в каталоге компании, но не на текущем складе |
| `UNKNOWN` | Штрихкод не найден |

Неоднозначность: **409** + `matches[]` (как на кассе) **или** `200` с `ambiguous: true`. Один контракт на оба клиента.

### 1.2 Атомарный приход

```
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

Правила:

- Одна транзакция: либо все позиции проведены, либо ничего.
- `IN_CATALOG` должен **оприходовать товар на текущий склад** (создать складскую связь, если её не было).
- `quantity` — decimal-строка, как в остальных складских API.
- Ошибка → 4xx/5xx, остатки не меняются частично.

Ответ 201/200: `{ "id": "document-uuid", "items_count": 2 }` (поля свободные, FE не зависит от тела).

### 1.3 Создание карточки

Уже есть `POST /main/products/create-by-barcode/` и
`POST /warehouse/{warehouse_id}/products/scan/`.

FE шлёт `{ barcode, name, price?, warehouse? }`. Нужно, чтобы после create товар находился как `IN_CATALOG` (а лучше сразу был доступен для mass-incoming).

---

## Модуль 2. Уведомления (обязательно для полного ТЗ)

Уже есть:

- `GET /main/notifications/`
- `POST /main/notifications/{id}/read/`
- `POST /main/notifications/mark-all-read/`
- WebSocket `/ws/notifications/?token=...`
- `unread_count` в REST и WS

FE уже рисует бейдж из `unreadCount` и вкладки. Локально показывает тарифный алерт по `company.end_date` (7/3/1), **не подменяя** серверные записи эвристикой по тексту.

### 2.1 Модель

| Поле | Тип | Обязательно |
|------|-----|-------------|
| `id` | uuid | да |
| `category` | `tariff` \| `system` \| `news` \| `other` | да |
| `title` | string | да |
| `body` | string | да |
| `is_read` | bool | да |
| `created_at` | datetime | да |
| `cta_url` | string | нет |
| `cta_label` | string | нет |
| `meta` | object | нет (`days_left` для тарифа) |

Алиасы, которые FE тоже поймёт: `type`/`kind` = `subscription`, `maintenance`, `promo`.

### 2.2 API

```
GET    /main/notifications/?category=&is_read=&limit=&offset=
POST   /main/notifications/{id}/read/
POST   /main/notifications/mark-all-read/          // опц. ?category=
DELETE /main/notifications/{id}/
```

`GET` должен возвращать `unread_count` как сейчас.

Если `category` не передан — все типы (вкладка «Все»).

### 2.3 Тарифные джобы

Создавать уведомление `category=tariff` за **7, 3 и 1 день** до `company.end_date`.

- Не спамить: одно уведомление на порог на компанию.
- CTA: `cta_label=Продлить`, `cta_url` — страница оплаты/подписки.
- `meta.days_left`: 7 | 3 | 1.

### 2.4 Сервисные и новости

Админка/сервис должен уметь публиковать `system` (техработы, рестарт) и `news` (функции, акции, обучение).

---

## Модуль 3. Второй экран (опционально, фаза 2)

MVP на FE: localStorage + `BroadcastChannel('nur-market-customer-display')`. Backend не нужен.

Если понадобится общая настройка на сеть магазинов:

```
GET/PUT /main/pos/customer-display/
{
  "enabled": true,
  "welcome_text": "Добро пожаловать в …",
  "slides": [{ "image_url": "https://…", "caption": "Акция" }]
}
```

QR на оплату — только когда появится платёжная интеграция. Сейчас FE QR не показывает.

---

## Модуль 4. Быстрые слоты F3+0..9 (желательно)

Продуктовый гейт на FE: **вариант A**.

- `F1, F2, F4–F12` — по-прежнему открывают группу `hotkey_group`.
- Одиночный `F3` на кассе **больше не** открывает группу: 2 секунды ждёт цифру `0–9` и добавляет слот в чек.
- Если открыта модалка групп, `F3` по-прежнему переключает вкладку F3.

Слоты MVP лежат в `localStorage` (`market_f3_slots_{companyId}`).

Фаза 2 — одинаковые слоты на всех кассах:

```
GET /main/pos/quick-slots/
PUT /main/pos/quick-slots/
```

Тело:

```json
{
  "0": "product-uuid-or-null",
  "1": "…",
  "9": null
}
```

Scope: компания (по умолчанию) или филиал — зафиксировать. Права: owner/admin или `can_edit_pos`.

Сосуществование с `hotkey_group` обязательно: группы F1–F12 не удалять.

---

## Модуль 5. Денежный ящик

Только фронт. Настройки: `/crm/pos-print-settings`, ключи `escpos_drawer_*`.  
Команда по умолчанию: `27, 112, 0, 25, 250` (`ESC p`). Backend не требуется.

---

## Модуль 6. Товар 18+ (обязательно для полного сценария)

Подробно: [`adult-products-backend.md`](./adult-products-backend.md).

Фронт уже:

- чекбокс «Товар 18+» в карточке (`is_adult` в create/PATCH);
- на кассе AlertModal «Этот товар предназначен для совершеннолетних»;
- на втором экране оверлей «Вам есть 18?» до подтверждения кассира.

Пока поля нет, FE пишет id в `localStorage` (`market_adult_products_{companyId}`). Это не замена API.

Нужно boolean `is_adult` (default `false`) на Product и отдача в:

- `GET /main/products/list/`
- `GET /main/products/{id}/`
- `POST /main/products/create-manual/`
- `PATCH /main/products/{id}/`
- `POST /main/products/create-by-barcode/`
- ambiguous barcode `matches[]`
- желательно POS `scan` и barcode-lookup

Касса **не** ждёт серверного age-gate: `add-item` / `scan` не блокировать. Второй экран по-прежнему без backend.

---

## Чеклист приёмки Backend

- [ ] `GET /warehouse/{id}/barcode-check/{code}/` — три статуса, alternate barcodes, ambiguous
- [ ] `POST /warehouse/{id}/mass-incoming/` — all-or-nothing, IN_CATALOG создаёт остаток на складе
- [ ] `category` в уведомлениях + фильтр GET
- [ ] `DELETE /main/notifications/{id}/`
- [ ] Джобы тарифа 7 / 3 / 1 + CTA «Продлить»
- [ ] Публикация system/news
- [ ] `is_adult` на Product: create/PATCH/list/detail, default false
- [ ] `is_adult` в ambiguous matches и желательно в POS scan
- [ ] (фаза 2) `GET/PUT /main/pos/quick-slots/`
- [ ] (фаза 2) настройки второго экрана, если нужны на сеть магазинов

---

## Сообщения об ошибках

Единообразно: `{ "detail": "человекочитаемый текст" }` или `{ "message": "…" }`.  
Частичный успех mass-incoming **запрещён**.
