# Flutter: срок годности товара (простая модель + партии/FEFO)

Полный контракт для мобильного клиента: как товар получает срок годности, как это влияет на фильтры/уведомления склада, и отдельная (более сложная, **пока не подтверждена на бэке**) модель учёта по партиям прихода.

**Веб-экраны:**
- Склад: `/crm/sklad` (список, форма добавления/редактирования товара — секция «Срок годности»)
- Карточка товара: `/crm/sklad/{id}` (секция «Партии по сроку годности» — только за флагом)
- Аналитика: `/crm/market/analytics` → таб «Товары»
- Колокольчик уведомлений (агрегированный digest)

**Веб-код (эталон):**
- `src/entities/product/lib/productExpiry.ts` — статус/дни, локальный best-effort digest, `isBatchExpiryEnabled`
- `src/entities/product/api/products.ts` — `fetchProductExpiryBatchesApi`
- `src/features/warehouse-ops/ui/AddProductPage/utils/shelfLife.ts` — конвертация дни/месяцы ↔ `shelf_life_days`
- `src/features/warehouse-ops/ui/AddProductPage/utils/productUtils.ts` — сборка payload товара
- `src/pages/warehouse/ui/components/ExpiryBatchHistory.tsx` / `ExpiryBatchTable.tsx` / `ExpiryBatchHistoryModal.tsx` — секция партий на карточке товара
- `.env.example` → `VITE_PRODUCT_BATCH_EXPIRY`

**Бэкенд-доки:**
- [product-expiry-tracking-backend.md](../backend/product-expiry-tracking-backend.md) — простая модель, одна дата на товар
- [product-batch-expiry-backend.md](../backend/product-batch-expiry-backend.md) — партии/FEFO

**Статус (2026-09-11):**

| Компонент | Статус |
|-----------|--------|
| **Бэкенд — простая модель (`expiration_date`)** | ⚠️ Требуется реализация — фронт уже шлёт поле, но неизвестно, сохраняет ли бэк его или молча игнорирует как незнакомый ключ |
| **Бэкенд — партии (`shelf_life_days`, `ProductExpiryBatch`)** | ⚠️ **Только ТЗ, не реализовано.** Открытый вопрос §7 первого документа закрыт (выбран «вариант B»), но кода на бэке нет |
| **Веб nur-market** | Простая модель — форма шлёт `expiration_date`; партии — реализованы **за флагом** `VITE_PRODUCT_BATCH_EXPIRY` (по умолчанию `false`) |
| **Flutter** | Простая модель — можно реализовать сейчас (§1); партии — **НЕ строить UI**, пока бэк не подтвердит рабочие эндпоинты на целевом стенде (§2.5) |

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <accessToken>`.
Таймзона: **Asia/Bishkek (UTC+6)**. Даты — `YYYY-MM-DD`. Количества в новой модели партий — decimal-строки (`"20.000"`).

---

## Содержание

1. [Простая модель: `expiration_date`](#1-простая-модель-expiration_date)
2. [Пороги статуса](#2-пороги-статуса)
3. [Фильтры каталога, завязанные на срок годности](#3-фильтры-каталога-завязанные-на-срок-годности)
4. [Аналитика: таб «Товары»](#4-аналитика-таб-товары)
5. [Уведомления](#5-уведомления)
6. [Партии прихода (FEFO) — модель и статус](#6-партии-прихода-fefo--модель-и-статус)
7. [Dart-модели](#7-dart-модели)
8. [Чеклист Flutter](#8-чеклист-flutter)
9. [Связанные документы](#9-связанные-документы)

---

## 1. Простая модель: `expiration_date`

Одно поле на товаре, `date | null`. Устанавливается вручную в форме товара, не пересчитывается автоматически (в этой модели — до появления партий, см. §6).

| Эндпоинт | Поле | Примечание |
|----------|------|------------|
| `POST /main/products/create-manual/` | `expiration_date` | опционально, `null` если товар не портится |
| `POST /main/products/create-by-barcode/` | `expiration_date` | опционально |
| `PATCH /main/products/{id}/` | `expiration_date` | перезаписывает предыдущее значение целиком (в простой модели — «последний ввод выигрывает») |
| `GET /main/products/` / `GET /main/products/{id}/` | `expiration_date` | отдаётся в ответе; на его основе строится бейдж «Просрочен» / «Истекает» в таблице склада |

```json
{ "expiration_date": "2026-10-15" }
```

**Важно для Flutter:** по состоянию на дату этого дока бэк **не подтвердил**, что поле реально сохраняется (может тихо игнорироваться как незнакомый ключ сериализатора). Перед реализацией бейджа проверить на целевом стенде: `PATCH` с `expiration_date`, затем `GET` того же товара — значение должно вернуться.

---

## 2. Пороги статуса

Общие для простой модели и для партий (см. §6) — не дублировать другими числами:

| Статус | Условие (`days_left`) |
|--------|------------------------|
| `expired` | `days_left < 0` |
| `critical` | `0 ≤ days_left ≤ 3` |
| `warning` | `3 < days_left ≤ 14` |
| нет статуса | `days_left > 14` или `expiration_date == null` |

`days_left = expiration_date - today`, начало дня, **Asia/Bishkek**. Пороги (`3`, `14`) — константы на бэке и клиенте (в вебе — `DEFAULT_CRITICAL_DAYS` / `DEFAULT_WARNING_DAYS` в `productExpiry.ts`), в перспективе могут стать настройкой компании (P2, не блокер).

```dart
enum ProductExpiryStatus { expired, critical, warning, none }

ProductExpiryStatus statusFromDaysLeft(int? days, {int criticalDays = 3, int warningDays = 14}) {
  if (days == null) return ProductExpiryStatus.none;
  if (days < 0) return ProductExpiryStatus.expired;
  if (days <= criticalDays) return ProductExpiryStatus.critical;
  if (days <= warningDays) return ProductExpiryStatus.warning;
  return ProductExpiryStatus.none;
}

int? daysUntilExpiry(DateTime? expirationDate) {
  if (expirationDate == null) return null;
  final now = DateTime.now();
  final startOfToday = DateTime(now.year, now.month, now.day);
  return expirationDate.difference(startOfToday).inDays;
}
```

---

## 3. Фильтры каталога, завязанные на срок годности

Уже документированы в [products-catalog.md](./products-catalog.md) §1–2 — здесь только пересечение, не дублировать таблицу целиком:

- Пресеты `preset=shelf_life_expires_7d` и `preset=shelf_life_expired` (готовые, пороги 7 дней зашиты на бэке — не совпадают с локальными `critical`/`warning` порогами §2, это отдельная классификация для списка склада).
- Произвольный фильтр: `shelf_life_condition=expires_within|expired` + `shelf_life_value` (дни) — работает **по полю `expiration_date`** (простая модель). Для варианта с партиями поведение этого фильтра бэком пока не переопределено — считать, что он продолжит читать агрегат `expiration_date` (см. §6.3).

---

## 4. Аналитика: таб «Товары»

`GET` аналитики, `tab=products` (по аналогии с существующим `low_stock_products`).

### `cards`

```json
{ "expiring_products_count": 7 }
```

Считает товары со статусом `critical` или `warning`; `expired` — не обязательно входит в этот счётчик (уточнить у бэка при интеграции, что именно считается).

### `tables.expiring_products[]`

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

Сортировка: сначала `expired`, затем по возрастанию `days_left`. Лимит — как у `low_stock_products` (топ 50–100, без пагинации).

---

## 5. Уведомления

### 5.1 Серверный дайджест: `market.product.expiring`

**Отдельный механизм от общего каталога `market.*` в [realtime-notifications.md](./realtime-notifications.md) §3** — на момент этого дока `market.product.expiring` **не входит** в таблицу событий того документа (последняя ревизия каталога его не перечисляет). Транспорт (WS `wss://{host}/ws/notifications/?token=...`, формат конверта `{"type":"notification","data":{...}}`) — тот же, но событие специфично для срока годности и добавлено отдельным контрактом. При парсинге на Flutter не полагаться на то, что оно уже есть в общем switch каталога — обрабатывать явно по имени.

Публикуется **раз в сутки** (ночной cron, ориентировочно 08:00 Asia/Bishkek) на компанию, **одно агрегированное** уведомление (не по одному на товар):

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

`level`: `error`/`critical`, если `expired_count > 0`, иначе `warning`. Идемпотентно — один digest в день на компанию (dedupe `(company_id, event_type, date)`), повторный запуск cron не задваивает push.

**Статус на бэке — требуется реализация** (P1 в обоих контрактах, не блокер MVP). До появления — Flutter получает **ноль** пушей по сроку годности.

### 5.2 Локальный best-effort (временное решение веба, опционально портировать)

Веб держит фолбэк: пока список товаров уже загружен на клиенте в этой сессии, колокольчик локально считает истекающие/просроченные товары и показывает один сводный пункт (`buildProductExpiryLocalNotification` в `productExpiry.ts`). Ограничения: работает только если товары уже подгружены, не переживает перезапуск приложения, не видно другим сотрудникам компании. Это **не замена** серверного push — если Flutter портирует, явно помечать как локальный/временный индикатор, не как полноценное уведомление.

---

## 6. Партии прихода (FEFO) — модель и статус

### 6.1 Зачем и статус

Простая модель (§1) хранит **одну дату на товар**, которая перезатирается при каждом новом приходе — не отражает разные остатки с разными сроками (партия A истекает через 3 дня, партия B — через 6, обе есть в наличии). Контракт [product-batch-expiry-backend.md](../backend/product-batch-expiry-backend.md) вводит партии — **выбор «варианта B»** из открытого вопроса §7 первого контракта.

**Критично:** на дату этого дока (2026-09-11) документ описывает **только ТЗ** — по тексту самого бэкенд-контракта: «бэкенд — ТЗ к реализации». Ни модель `ProductExpiryBatch`, ни `receive_stock()`/`consume_stock()`, ни эндпоинт `GET /main/products/{id}/expiry-batches/` не подтверждены как задеплоенные на каком-либо стенде.

Веб-код это отражает флагом `VITE_PRODUCT_BATCH_EXPIRY` (по умолчанию `false`) — код написан и ждёт бэк, но выключен в проде и на стейджинге, пока BE не задеплоен и не прогнан вручную (см. «Порядок выката» ниже).

> **Для Flutter: НЕ реализовывать UI партий (форма «дней хранения», секция «Партии по сроку годности», список `expiry-batches`) как часть текущего спринта.** Дождаться явного подтверждения от бэкенда, что эндпоинты §6.4 отвечают на целевом окружении (staging/prod) — по аналогии с тем, как веб держит это за выключенным по умолчанию флагом. Даже если реализовать код заранее «за флагом» на Flutter-стороне — держать флаг выключенным до подтверждения BE, симметрично вебу.

### 6.2 Модель (как задумано, ещё не подтверждена)

`Product` получает новое поле:

```python
shelf_life_days: int | null   # длительность хранения в днях; 1 месяц = 30 дней (конвенция фронта)
```

`Product.expiration_date` **не удаляется** — переопределяется по смыслу: если у товара есть партии, бэкенд отдаёт туда **агрегат** (см. §6.3), а не то, что ввёл пользователь напрямую.

Новая модель `ProductExpiryBatch` (одна запись на партию прихода):

| Поле | Тип | Смысл |
|------|-----|-------|
| `id` | uuid | — |
| `product` | uuid | FK на товар |
| `quantity` | decimal-строка | сколько пришло |
| `remaining_quantity` | decimal-строка | сколько осталось |
| `received_at` | datetime | дата прихода |
| `expires_at` | date \| null | `received_at + shelf_life_days` на момент прихода, **заморожено** (не пересчитывается при смене `shelf_life_days` у товара задним числом) |
| `status` | `active` \| `consumed` \| `expired` | — |
| `source_kind` | `purchase` \| `mass_incoming` \| `initial_stock` \| `manual_adjustment` \| `sale_return` | откуда партия |
| `source_id` | string \| null | id операции-источника, для трассировки |

Партия **не создаётся**, если `shelf_life_days IS NULL` на товаре в момент прихода (обычный непортящийся товар — как сейчас).

### 6.3 Списание — FEFO (First-Expired-First-Out)

При расходе (продажа, возврат поставщику, брак, ручное уменьшение остатка) партии списываются **по возрастанию `expires_at`** (раньше истекающие — первыми; партии без `expires_at` — в конец). Если запрошено списать больше, чем есть в сумме по активным партиям, — списывается что есть, **без ошибки** (`Product.quantity` остаётся источником истины по общему количеству, партии — доп. детализация).

`Product.expiration_date` в ответах `GET` в этой модели — **вычисляемое** поле: `expires_at` ближайшей активной партии (`remaining_quantity > 0`, `status="active"`), либо `null`. Это значит существующий Flutter-код, читающий `product.expiration_date` напрямую (простая модель, §1), продолжит работать **без изменений**, если/когда партии включатся — обратная совместимость на уровне поля.

`expiry_batches[]` — превью (топ ~10 активных партий по `expires_at` ↑) прямо в ответе `GET /main/products/` и `GET /main/products/{id}/`.

### 6.4 API (спецификация, не подтверждена работающей)

```json
// POST/PATCH товара, вместо expiration_date — за флагом
{ "shelf_life_days": 6 }
```

```http
GET /main/products/{id}/expiry-batches/?page=1&limit=20
```

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "batch-uuid-a",
      "quantity": "20.000",
      "remaining_quantity": "14.000",
      "received_at": "2026-09-01T10:00:00+06:00",
      "expires_at": "2026-09-07",
      "days_left": 3,
      "status": "active",
      "source_kind": "purchase",
      "source_id": "receipt-uuid",
      "supplier_name": "Белая река",
      "created_by_name": "Айжан"
    }
  ]
}
```

`days_left` считается бэком (Asia/Bishkek) — клиент использует напрямую, не пересчитывает (иначе расхождения из-за таймзоны устройства). Ответ `404`/`405` на этом эндпоинте трактовать как «партий нет» — не показывать ошибку, скрывать секцию.

### 6.5 Переходный период (пока флаг выключен или бэк не готов)

- Клиент шлёт `expiration_date` как раньше (§1) — бэк принимает оба поля независимо, если/когда добавит `shelf_life_days` в сериализатор.
- Если клиент включит флаг раньше бэка: `shelf_life_days` в `PATCH` будет молча проигнорирован (не ошибка, просто не сохранится); `GET .../expiry-batches/` вернёт `404/405` → секция скрывается.
- Порядок реального выката (см. контракт): BE миграция + эндпоинты → деплой на staging → FE флаг включается на staging для ручного прогона сценария «две партии, разные дни» → затем прод в одном релизе BE+FE. Flutter должен дождаться этого же порядка, а не включать раньше веба.

---

## 7. Dart-модели

```dart
class ProductExpiryBatch {
  final String id;
  final String quantity;            // decimal-строка
  final String remainingQuantity;
  final DateTime receivedAt;
  final DateTime? expiresAt;
  final int? daysLeft;              // предпочитать это поле, не пересчитывать локально
  final String status;              // active | consumed | expired
  final String sourceKind;
  final String? sourceId;
  final String? supplierName;
  final String? createdByName;

  ProductExpiryBatch.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        quantity = j['quantity'] as String,
        remainingQuantity = j['remaining_quantity'] as String,
        receivedAt = DateTime.parse(j['received_at'] as String),
        expiresAt = j['expires_at'] != null ? DateTime.parse(j['expires_at']) : null,
        daysLeft = j['days_left'] as int?,
        status = j['status'] as String,
        sourceKind = j['source_kind'] as String,
        sourceId = j['source_id'] as String?,
        supplierName = j['supplier_name'] as String?,
        createdByName = j['created_by_name'] as String?;
}

int? getBatchDaysLeft(ProductExpiryBatch batch) {
  if (batch.daysLeft != null) return batch.daysLeft;
  if (batch.expiresAt == null) return null;
  final now = DateTime.now();
  final startOfToday = DateTime(now.year, now.month, now.day);
  return batch.expiresAt!.difference(startOfToday).inDays;
}
```

---

## 8. Чеклист Flutter

### Простая модель (`expiration_date`) — можно делать сейчас

- [ ] Форма товара: поле «Срок годности» (date picker) → `expiration_date` в `POST/PATCH` товара
- [ ] Проверить на целевом стенде, что бэк реально сохраняет и возвращает `expiration_date` (не тихо игнорирует)
- [ ] Бейдж статуса (`expired`/`critical`/`warning`) в списке склада по порогам §2
- [ ] Фильтры каталога: `preset=shelf_life_expires_7d`, `preset=shelf_life_expired`, произвольный `shelf_life_condition`/`shelf_life_value` (см. [products-catalog.md](./products-catalog.md))
- [ ] Таб «Товары» в аналитике: `cards.expiring_products_count`, `tables.expiring_products[]`

### Уведомления

- [ ] `market.product.expiring` обрабатывать явно по имени типа — **не** входит в общий каталог `market.*` из [realtime-notifications.md](./realtime-notifications.md) на момент написания
- [ ] Дедуп по `id` уведомления (общее правило идемпотентности WS, см. realtime-notifications.md)
- [ ] (опционально) локальный best-effort digest по уже загруженному списку товаров — явно помечать как временный/локальный индикатор, не как замену серверного push

### Партии (FEFO) — НЕ строить раньше подтверждения бэка

- [ ] Не реализовывать форму «дней/месяцев хранения» (`shelf_life_days`) и секцию «Партии» до явного подтверждения BE, что `GET /main/products/{id}/expiry-batches/` отвечает на целевом окружении
- [ ] Если делаете заранее — держать за отдельным флагом (аналог `VITE_PRODUCT_BATCH_EXPIRY`), по умолчанию выключен
- [ ] Не полагаться, что `shelf_life_days` в `PATCH` товара что-то делает без подтверждения — молча проигнорируется
- [ ] `GET .../expiry-batches/` на `404/405` — трактовать как «партий нет», не показывать ошибку
- [ ] Если/когда включаете: `product.expiration_date` в ответах продолжит работать как агрегат — существующий бейдж (простая модель) ломаться не должен

---

## 9. Связанные документы

| Документ | Тема |
|----------|------|
| [products-catalog.md](./products-catalog.md) | Список/фильтры товаров, пресеты `shelf_life_expires_7d` / `shelf_life_expired` |
| [add-product.md](./add-product.md) | Форма создания/редактирования товара, поле `expiration_date` |
| [realtime-notifications.md](./realtime-notifications.md) | WS-контракт, каталог `market.*`, дедуп, доставка по группам |
