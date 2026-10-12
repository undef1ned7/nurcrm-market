# Маркет — товар 18+: ТЗ для бэкенда

**Фронт:** карточка товара + касса + второй экран покупателя  
**Статус:** фронт готов; бэкенд отсутствует. Пока API не отдаёт `is_adult`, фронт держит флаг в `localStorage` (`market_adult_products_{companyId}`) после сохранения карточки. Это fallback одной кассы, не синхронизируется между устройствами.

Связанные существующие эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `POST` | `/main/products/create-manual/` | создание карточки |
| `PATCH` | `/main/products/{id}/` | редактирование |
| `GET` | `/main/products/list/` | каталог склада и кассы |
| `GET` | `/main/products/{id}/` | редактирование / деталка |
| `POST` | `/main/products/create-by-barcode/` | создание со скана |
| `POST` | `/warehouse/{uuid}/products/scan/` | складской скан-create |
| `POST` | `/main/pos/sales/{id}/add-item/` | добавить в чек |
| `POST` | `/main/pos/sales/{id}/scan/` | скан на кассе |

Второй экран покупателя — только фронт (`BroadcastChannel`). Backend для 18+ **не нужен**.

---

## Purpose

Администратор помечает товар как **18+** (алкоголь, табак и т.п.).

На кассе при первом добавлении такой позиции в чек:

1. Кассир видит уведомление: «Этот товар предназначен для совершеннолетних».
2. Если открыт второй экран — покупатель видит «Вам есть 18?».
3. Кассир нажимает «Подтвердить» → надпись на втором экране пропадает, товар остаётся в чеке.

Повторное увеличение количества той же позиции в том же чеке **не** спрашивает возраст снова.

---

## Модель

Добавить на Product boolean-поле, по аналогии с `is_weight`.

| Поле | Тип | Default | Обязательно |
|------|-----|---------|-------------|
| `is_adult` | bool | `false` | нет |

Алиас, который фронт тоже поймёт: `is_18_plus`. Каноническое имя — **`is_adult`**.

Правила:

- Только `kind=product`. Для услуги/комплекта всегда `false`.
- Неизвестное поле на старых клиентах игнорировать нельзя: **принимать** в create/PATCH.
- Если поле не передано — не затирать существующее значение (PATCH частичный).
- `null` не использовать; только `true` / `false`.

---

## Где отдавать поле

Флаг должен быть в **каждом** ответе, где касса или склад видит товар. Иначе касса не узнает, что товар 18+.

Обязательно:

- `GET /main/products/list/` (каталог кассы, пагинация, поиск)
- `GET /main/products/{id}/`
- `POST /main/products/create-manual/` — эхо в ответе
- `PATCH /main/products/{id}/` — эхо в ответе
- `POST /main/products/create-by-barcode/` и `POST /warehouse/{uuid}/products/scan/`
- POS scan: `POST /main/pos/sales/{id}/scan/` — в связанном product / item, если он там есть
- Ambiguous barcode `matches[]` — каждый match должен содержать `id`, `name`, **`is_adult`**

Желательно (чтобы не зависеть от list):

- `GET /main/products/global-barcode/{code}/`
- `GET /main/products/warehouse-barcode/{code}/`
- `GET /warehouse/{id}/barcode-check/{code}/` (mass-incoming)

Фильтр списка не обязателен. Если добавите — `?is_adult=true|false`.

---

## Create / PATCH

`POST /main/products/create-manual/` и `PATCH /main/products/{id}/`:

```json
{
  "name": "Вино красное 0.75",
  "is_adult": true
}
```

Остальные поля без изменений. `is_adult` можно слать вместе с `is_weight`, ценами, `packages_input` и т.д.

`POST /main/products/create-by-barcode/`:

```json
{
  "barcode": "4601234567890",
  "name": "Пиво",
  "is_adult": true
}
```

---

## Касса

Фронт **сам** показывает уведомление и оверлей второго экрана. Backend **не** блокирует `add-item` / `scan` по возрасту и **не** требует отдельного «age confirmed» флага в запросе.

Не нужно:

- отклонять 18+ без подтверждения;
- писать в чек `age_confirmed`;
- слать push/notification в центр уведомлений CRM.

Достаточно, чтобы `is_adult` приезжал в list/detail/scan/matches.

---

## Второй экран

Не менять. MVP: `BroadcastChannel('nur-market-customer-display')`, типы `age-check` / `age-check-dismiss`.

---

## Миграция

1. Добавить колонку `is_adult boolean not null default false`.
2. Существующие товары = `false`.
3. После выката фронт перестанет опираться на localStorage, как только list начнёт отдавать поле (явный `true`/`false` побеждает локальный кэш).

---

## Чеклист приёмки Backend

- [ ] `is_adult` принимается в `create-manual`, `PATCH`, `create-by-barcode`
- [ ] `is_adult` есть в `GET list` и `GET {id}`
- [ ] `is_adult` есть в ambiguous `matches[]` и желательно в POS scan
- [ ] Default `false`, без `null`
- [ ] Услуги/комплекты не становятся 18+ случайно
- [ ] Ошибка — `{ "detail": "…" }` или `{ "message": "…" }`
