# Срок годности товара: уведомления + аналитика

**Страницы:** `/crm/sklad` (карточка/форма товара, список склада), `/crm/market/analytics` (таб «Товары»), колокольчик уведомлений
**Статус фронта:** форма товара уже отправляет `expiration_date` (готово ранее); таблица склада и локальный best-effort бейдж в колокольчике — реализовано в этом контракте; блок аналитики **ждёт бэкенд**
**Статус бэка:** требуется реализация
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Читать вместе с: [product-form-layout-backend.md](./product-form-layout-backend.md) (раскладка формы товара), [kassa/realtime-notifications-backend.md](./kassa/realtime-notifications-backend.md) (WS-контракт, группы доставки, `market.*` события), [analytics.md](./analytics.md) (таймзона фильтров аналитики).

---

## 1. Зачем

У товаров есть срок годности. Сейчас он **вводится на фронте, но нигде не используется**:

- форма товара (`/crm/sklad` → добавить/редактировать товар) уже шлёт поле `expiration_date` в `POST/PATCH /main/products/` — **нужно подтвердить, что бэк принимает и сохраняет это поле** (сейчас неизвестно, возможно, оно просто игнорируется как неизвестный ключ);
- нет уведомления, когда товар просрочен или скоро просрочится;
- нет отдельного среза в аналитике `crm/market/analytics` → таб «Товары».

Это ТЗ закрывает все три пункта.

---

## 2. Модель: поле `expiration_date`

**Что уже делает фронт:** `MarketProductForm` → секция «Срок годности» → `marketData.expiryDate` (тип `date`, `YYYY-MM-DD`) → при сабмите уходит как:

```json
{ "expiration_date": "2026-10-15" }
```

(см. `productUtils.ts:223`, `expiration_date: marketData.expiryDate || null`). Поле необязательное — у большинства товаров (непродовольственных) его не будет.

**Нужно от бэка:**

1. Добавить `expiration_date: date | null` в модель `Product` (или `Batch`/партию прихода, если у вас учёт по партиям — см. §7 «Открытый вопрос»).
2. Принимать поле в `POST /main/products/`, `PATCH /main/products/{id}/`, `POST /main/products/create-by-barcode/`.
3. Отдавать поле в сериализаторе списка/деталки товара (`GET /main/products/`, `GET /main/products/{id}/`), чтобы фронт мог показывать бейдж «Просрочен» / «Истекает» в таблице склада без похода в аналитику.

---

## 3. Пороги «скоро истекает» / «просрочен»

Единая логика на фронте и бэке (дублируется, чтобы бейдж в таблице склада работал даже без ответа бэка):

| Статус | Условие (дней до `expiration_date`) |
|---|---|
| `expired` | `days_left < 0` |
| `critical` | `0 ≤ days_left ≤ 3` |
| `warning` | `3 < days_left ≤ 14` |

`days_left = expiration_date - today` (Asia/Bishkek, начало дня).

Пороги (`3`, `14`) — предлагаем захардкодить как дефолт, но **вынести в настройки компании** (по аналогии с `min_stock` для остатков), если у бизнеса уже есть подобный паттерн настроек склада. Не блокер для MVP — можно зашить константы на бэке и фронте одинаково.

---

## 4. Аналитика: таб «Товары» (`GET` аналитика, `tab=products`)

Фронт уже ждёт (см. `src/pages/analytics/ui/hooks/analytics/useAnalyticsTabData.ts`, блок `productsData`, по аналогии с уже существующим `low_stock_products`/`low_stock_count`):

### `cards`

```json
{
  "expiring_products_count": 7
}
```

Количество товаров со статусом `critical` или `warning` (просроченные считаются отдельно, см. таблицу ниже — не обязательно включать `expired` в этот счётчик, но задокументируйте, что именно считаете, чтобы фронт не разъезжался с бэком).

### `tables.expiring_products[]`

Мирроит уже существующий `tables.low_stock_products[]`:

```json
{
  "id": "uuid",
  "code": "00123",
  "name": "Йогурт «Свежесть» 500г",
  "quantity": 12,
  "expiration_date": "2026-09-10",
  "days_left": 6,
  "status": "critical"
}
```

`status` ∈ `expired | critical | warning` (см. §3). Сортировка: сначала `expired`, затем по возрастанию `days_left`. Лимит — как у `low_stock_products` (обычно топ 50–100, без пагинации на фронте).

---

## 5. Real-time уведомление: `market.product.expiring`

Добавлен в enum фронта (`src/shared/lib/notifications/realtimeEvents.ts` → `MARKET_REALTIME_EVENTS.PRODUCT_EXPIRING`). Публикуется по тому же контракту, что и остальные `market.*` события — см. [kassa/realtime-notifications-backend.md](./kassa/realtime-notifications-backend.md) §«Публикация с бэкенда».

**Когда публиковать:** ночной cron (например, 08:00 Asia/Bishkek) на компанию — если у компании есть товары с `status ∈ {expired, critical, warning}`, отправить **одно агрегированное** уведомление (не по одному на товар, чтобы не спамить):

```json
{
  "type": "notification",
  "data": {
    "type": "market.product.expiring",
    "title": "Истекает срок годности: 5 тов.",
    "message": "2 товара уже просрочены, ещё 3 — в ближайшие 14 дней.",
    "category": "system",
    "level": "warning",
    "is_read": false,
    "created_at": "2026-09-04T02:00:00Z",
    "url": "/crm/market/analytics#products-section-expiringProducts",
    "cta_label": "Открыть",
    "meta": {
      "company_id": "uuid",
      "expired_count": 2,
      "critical_count": 1,
      "warning_count": 2,
      "source_kind": "product_expiry_digest"
    }
  }
}
```

`level`: `error`/`critical` если есть `expired_count > 0`, иначе `warning`.

**Группы доставки:** `notifications:company:{company_id}` (и опционально `notifications:warehouse:{warehouse_id}`, если warehouse привязан к конкретному складу/филиалу).

**Идемпотентность:** один digest на компанию в день (dedupe по `(company_id, event_type="market.product.expiring", date)`), чтобы повторный запуск cron не задвоил уведомление.

**Фронт уже делает best-effort без бэка:** пока в браузере уже загружен список товаров (`state.product.list`), колокольчик локально считает истекающие/просроченные товары и показывает один сводный пункт (`src/entities/product/lib/productExpiry.ts` → `buildProductExpiryLocalNotification`). Это временное решение — **не заменяет** серверный push: срабатывает только если пользователь уже открывал список товаров в этой сессии, не переживает перезагрузку история, не видно другим сотрудникам компании.

---

## 6. Фильтр склада (опционально, P2)

Было бы полезно на `/crm/sklad` фильтровать список по `expiring_only=true` / `expired_only=true` (аналогично уже существующему `low_only`, если такой параметр есть в `GET /main/products/`). Не блокер для MVP — фронт пока считает статус на клиенте по уже загруженной странице.

---

## 7. Открытый вопрос к бэку

Срок годности хранится **на товаре** (`Product.expiration_date`, одно значение) или **на партии прихода** (`Batch`/`ProductReceipt`, если один товар может иметь несколько партий с разными сроками)? Форма фронта сейчас пишет одно значение на товар — если у вас учёт по партиям (FIFO/FEFO), нужно решить:

- **Вариант A (проще, MVP):** одно поле на `Product`, обновляется при каждом приходе (последний введённый срок годности «выигрывает»). Годится, если партии по факту не различаются на витрине.
- **Вариант B (точнее):** поле на партии, а `Product.expiration_date`/аналитика берут **минимальный** (самый ранний) срок годности среди остатков `quantity > 0`.

Если у вас уже есть модель партий/поступлений — подтвердите, где физически должно жить поле, прежде чем накатывать миграцию.

---

## 8. Чеклист

### P0 — минимум

- [ ] `expiration_date` сохраняется и отдаётся в `Product` (POST/PATCH/GET)
- [ ] `cards.expiring_products_count` + `tables.expiring_products[]` в аналитике таба `products`

### P1 — уведомления

- [ ] Ночной cron: digest `market.product.expiring` на компанию, идемпотентный (1/день)
- [ ] Группа доставки `notifications:company:{id}`

### P2 — доп.

- [ ] Фильтр `expiring_only`/`expired_only` в `GET /main/products/`
- [ ] Пороги (`critical_days`, `warning_days`) как настройка компании вместо константы
- [ ] Решить §7 (Product vs Batch) и, если нужно, смигрировать на минимальный срок по партиям

---

## 9. Тест-сценарии

1. Товар с `expiration_date = сегодня - 1 день` → в `tables.expiring_products` со `status="expired"`, `days_left=-1`.
2. Товар с `expiration_date = сегодня + 2 дня` → `status="critical"`.
3. Товар с `expiration_date = сегодня + 10 дней` → `status="warning"`.
4. Товар с `expiration_date = сегодня + 30 дней` → не попадает в выборку.
5. Товар без `expiration_date` (`null`) → не попадает в выборку, не ломает сортировку.
6. Cron запускается дважды за день (повторный деплой/ретрай) → только одно уведомление в БД и один WS-пуш.
7. У компании нет истекающих товаров → cron ничего не публикует (никаких пустых digest-уведомлений).
