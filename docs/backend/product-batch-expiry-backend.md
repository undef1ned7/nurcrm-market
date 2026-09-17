# Срок годности по партиям прихода (FEFO)

**Страницы:** `/crm/sklad/add-product/{id}` (форма товара, секция «Срок годности»), `/crm/sklad/{id}` (карточка товара, новая секция «Партии по сроку годности»)
**Статус фронта:** реализован за флагом `VITE_PRODUCT_BATCH_EXPIRY` (по умолчанию выкл) · **бэкенд — ТЗ к реализации**
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Читать вместе с: [product-expiry-tracking-backend.md](./product-expiry-tracking-backend.md) (предыдущая модель — одна дата на товар, §7 которого этот документ закрывает выбором **варианта B**), [kassa/procurement-history-returns-backend.md](./kassa/procurement-history-returns-backend.md) (приход/возврат поставщику, существующие партии закупки).

---

## 1. Проблема

Сейчас срок годности — **одно поле `Product.expiration_date`**, которое перезаписывается при каждом редактировании карточки товара. Это не отражает реальность склада:

> Товар хранится 6 дней. Пришла партия A — 20 шт. Через 3 дня пришла партия B — ещё сколько-то шт.
> Сегодня у партии A осталось **3 дня** до истечения, у партии B — **6 дней**. Это два разных
> остатка одного товара с разными сроками, а не одна дата на весь товар.

С текущей моделью второй приход просто затирает дату первого — партия A «теряет» свой более ранний срок, кассир/кладовщик не видит, что часть остатка портится раньше.

Это ТЗ вводит **партии (batches) с собственным сроком годности** — вариант B, который был оставлен открытым вопросом в §7 [product-expiry-tracking-backend.md](./product-expiry-tracking-backend.md).

---

## 2. Модель данных

### 2.1. `Product` — новое поле

```python
shelf_life_days = models.PositiveIntegerField(null=True, blank=True)
```

Длительность хранения в днях (не абсолютная дата). Форма товара просит «сколько дней или
месяцев товар хранится» — фронт пересчитывает месяцы в дни сам (**1 месяц = 30 дней**,
фиксированная конвенция, см. `shelfLifeToDays` в `shelfLife.ts`) и шлёт готовое число.

`Product.expiration_date` (существующее поле) **не удаляется** — переопределяется по смыслу:
бэкенд теперь пишет туда **агрегат**, не пользовательский ввод — см. §2.3.

### 2.2. Новая модель: `ProductExpiryBatch`

```python
class ProductExpiryBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="expiry_batches")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)             # сколько пришло
    remaining_quantity = models.DecimalField(max_digits=12, decimal_places=3)   # сколько осталось
    received_at = models.DateTimeField()                                       # дата прихода
    expires_at = models.DateField(null=True)                                   # received_at + shelf_life_days на момент прихода, "заморожено"
    status = models.CharField(choices=[("active", …), ("consumed", …), ("expired", …)], default="active")
    source_kind = models.CharField()   # "purchase" | "mass_incoming" | "initial_stock" | "manual_adjustment" | "sale_return"
    source_id = models.CharField(null=True)  # id прихода/операции, для трассировки
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
```

Индексы: `(product_id, status, expires_at)` — для быстрой выборки активных партий по сроку;
`(company_id, expires_at)` — для ночного cron-дайджеста (§6).

`expires_at` считается **один раз в момент создания партии** (`received_at + shelf_life_days`)
и не пересчитывается, даже если позже поменяют `Product.shelf_life_days` — иначе у старых
партий задним числом «поедет» срок. Если у товара `shelf_life_days IS NULL` в момент прихода —
партия **не создаётся** (обычный, непортящийся товар — так же, как сейчас).

### 2.3. Агрегаты на `Product` (для чтения)

В сериализаторе списка/деталки товара (`GET /main/products/`, `GET /main/products/{id}/`):

| Поле | Тип | Смысл |
|---|---|---|
| `shelf_life_days` | int \| null | длительность хранения (настройка) |
| `expiration_date` | date \| null | **вычисляемое**: `expires_at` ближайшей активной партии (`remaining_quantity > 0`, `status="active"`), либо `null`, если партий нет. Существующий фронт (бейдж в таблице склада, `getExpiryStatus`) продолжает читать это поле без изменений — обратная совместимость «бесплатно». |
| `expiry_batches` | array | **превью**: топ ~10 активных партий, отсортированных по `expires_at` ↑ (раньше истекающие — первые), для карточки товара |

---

## 3. Когда создаётся партия (приход)

Единая точка входа рекомендуется на бэке: сервис-функция вроде
`receive_stock(product, qty, received_at=now(), source_kind, source_id, user)`, вызываемая из
**всех** мест, увеличивающих остаток — вместо дублирования логики в каждом эндпоинте:

| Эндпоинт | Когда вызывается | `source_kind` |
|---|---|---|
| `POST /main/suppliers/{id}/receipt/` | приход от поставщика (главный кейс) | `purchase` |
| `POST /warehouse/{id}/mass-incoming/` | массовое сканирование прихода | `mass_incoming` |
| `POST /main/products/create-manual/` | создание товара с начальным остатком | `initial_stock` |
| `POST /main/products/add-to-warehouse/` | добавление существующего товара на склад | `initial_stock` |
| `PATCH /main/products/{id}/` (если `quantity` увеличился) | ручная правка остатка в карточке | `manual_adjustment` |
| возврат чека (не брак) — см. R8 в [sale-return-cashflow-backend.md](./kassa/sale-return-cashflow-backend.md) | товар возвращается на склад | `sale_return` |

Правило создания: если `product.shelf_life_days` задан на момент прихода →
`ProductExpiryBatch.objects.create(quantity=qty, remaining_quantity=qty, received_at=now, expires_at=now.date() + shelf_life_days, source_kind=…)`.
Если `shelf_life_days IS NULL` — no-op, как сейчас.

**Это не полный список** — бэкенд должен сверить с фактическим списком мест, где
`Product.quantity` увеличивается в текущем коде, и завести их все через общую точку входа.

---

## 4. Когда списывается партия (расход) — FEFO

Симметрично, единая точка `consume_stock(product, qty, source_kind, source_id)`:

1. Берём активные партии (`status="active"`, `remaining_quantity > 0`) этого товара,
   сортируем по `expires_at` **по возрастанию** (раньше истекающие — первые; партии без
   `expires_at`, если такие остались от старых записей, — в конец).
2. Списываем `qty` последовательно с начала списка, уменьшая `remaining_quantity` каждой
   партии, пока не наберём нужное количество.
3. Партия, у которой `remaining_quantity` дошёл до `0` → `status="consumed"`.
4. Если запрошено списать **больше**, чем есть в сумме по активным партиям (расхождение с
   легаси-остатками без партий, ручные корректировки) — списываем что есть, **не бросаем
   ошибку**. `Product.quantity` остаётся источником истины по общему количеству; партии —
   дополнительная детализация для отображения, не блокирующий леджер. Это осознанное
   упрощение MVP — партии могут разойтись с фактом при истории до включения фичи, это ок.

Вызывается из: продажи (POS, списание корзины), возврат поставщику (`POST
/main/suppliers/{supplier_id}/returns/`), брак/списание (`MarriageModal` →
`PATCH /main/products/{id}/` с уменьшением `quantity` или отдельный эндпоинт брака, если
есть), любая ручная правка `quantity` в сторону уменьшения.

Ночной джоб (не блокирует MVP, см. чеклист): партии, у которых `expires_at < today` и
`remaining_quantity > 0`, перевести в `status="expired"` (не блокирует продажу — это просто
для аналитики/бейджа; продавать просроченный остаток или нет — решение бизнеса, не техническое
ограничение на API).

---

## 5. API

### 5.1. Форма товара — создание/правка

`POST /main/products/create-manual/`, `PATCH /main/products/{id}/`:

```json
{ "shelf_life_days": 6 }
```

вместо `expiration_date` (когда фронт на флаге `VITE_PRODUCT_BATCH_EXPIRY`). `null` — товар не
портится, партии не создаются. Валидация: целое, `> 0` или `null`.

Пока флаг выключен где-либо на клиентах (переходный период) — фронт продолжает слать
`expiration_date` по-старому; бэк принимает оба поля независимо друг от друга.

### 5.2. Список партий товара

Мирроит уже существующий `GET /main/products/{id}/purchase-batches/`:

```http
GET /main/products/{id}/expiry-batches/?page=1&limit=20
Authorization: Bearer <access_token>
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
    },
    {
      "id": "batch-uuid-b",
      "quantity": "15.000",
      "remaining_quantity": "15.000",
      "received_at": "2026-09-04T09:00:00+06:00",
      "expires_at": "2026-09-10",
      "days_left": 6,
      "status": "active",
      "source_kind": "purchase",
      "source_id": "receipt-uuid-2",
      "supplier_name": "Белая река",
      "created_by_name": "Айжан"
    }
  ]
}
```

`days_left` — посчитан на бэке (Asia/Bishkek, начало дня), фронт использует его напрямую
(`getBatchDaysLeft`), не пересчитывает, чтобы не разъезжаться из-за таймзоны клиента.
Сортировка: по `expires_at` ↑, `null` — в конец. Пагинация — как у `purchase-batches`.

Ответ `404`/`405` (эндпоинт ещё не готов) фронт трактует как «партий нет», не ломает карточку
товара — секция скрывается, ошибка не показывается пользователю агрессивно.

### 5.3. Список/деталка товара — новые поля

`GET /main/products/`, `GET /main/products/{id}/` — добавить `shelf_life_days`,
пересчитанный `expiration_date` (агрегат, см. §2.3), `expiry_batches[]` (превью, до 10 штук).

---

## 6. Real-time и уведомления (P1, не блокер MVP)

`market.product.expiring` уже описан в [product-expiry-tracking-backend.md](./product-expiry-tracking-backend.md)
§5 — ночной дайджест на компанию. С партиями считать по **партиям**, не по одному полю
товара: критично/скоро — если есть хотя бы одна активная партия с `days_left` в диапазоне
(см. пороги §7). Один товар с двумя партиями (одна критичная, одна нет) — считается один раз
в счётчике «критично», не дважды.

---

## 7. Пороги статуса (без изменений от предыдущего контракта)

| Статус | Условие |
|---|---|
| `expired` | `days_left < 0` |
| `critical` | `0 ≤ days_left ≤ 3` |
| `warning` | `3 < days_left ≤ 14` |

Те же константы, что и в [product-expiry-tracking-backend.md](./product-expiry-tracking-backend.md)
§3 — не дублировать разными числами на партиях и на товаре.

---

## 8. Миграция и обратная совместимость

- Существующие товары с `expiration_date`, но без партий: `shelf_life_days = null` после
  миграции (нет данных, откуда взять длительность). Их `expiration_date` **не трогаем** —
  бэкенд отдаёт как раньше (буквально записанное значение), пока для товара не заведут
  первую партию (тогда появится `shelf_life_days`, и агрегат начнёт работать по партиям).
- Бэкфилл истории партий **не делаем** (аналогично решению по кассе в
  [kassa/OPEN-QUESTIONS-2026-09-BE-RESPONSE.md](./kassa/OPEN-QUESTIONS-2026-09-BE-RESPONSE.md)
  Блок 4) — прошлые приходы без партий остаются как есть, партии появляются только для новых
  приходов после того, как на товаре включена `shelf_life_days`.
- Пока флаг `VITE_PRODUCT_BATCH_EXPIRY` выключен на фронте — форма товара продолжает слать
  `expiration_date` как раньше, ничего на бэке ломаться не должно.

---

## 9. Чеклист

### P0 — минимум (делает саму фичу рабочей)

- [ ] Миграция: `Product.shelf_life_days`, модель `ProductExpiryBatch`
- [ ] `receive_stock()` — создание партии при приходе (см. §3), подключить ко **всем**
      местам увеличения `quantity`
- [ ] `consume_stock()` — списание FEFO (см. §4), подключить ко всем местам уменьшения
      `quantity`
- [ ] `POST/PATCH /main/products/`: принимать `shelf_life_days`
- [ ] `GET /main/products/`, `GET /main/products/{id}/`: отдавать `shelf_life_days`,
      пересчитанный `expiration_date` (агрегат), `expiry_batches[]` (превью)
- [ ] `GET /main/products/{id}/expiry-batches/` — пагинированный список партий

### P1 — уведомления и cron

- [ ] Ночной джоб: `active` → `expired` при `expires_at < today`
- [ ] `market.product.expiring` — считать по партиям, не по одному полю (см. §6)

### P2 — доп.

- [ ] Явный выбор партии при возврате чека (сейчас — новая партия «с нуля» при возврате не
      брака, см. §3 `sale_return`)
- [ ] Фильтр `expiring_only`/`expired_only` в `GET /main/products/` (уже был в P2 предыдущего
      контракта, актуален и здесь)
- [ ] Ручной ввод `expires_at` партии при приходе (если реальный срок на упаковке отличается
      от расчётного — сейчас `expires_at` всегда = `received_at + shelf_life_days`, без
      возможности переопределить на конкретной партии)

---

## 10. Тест-сценарии

1. Товар с `shelf_life_days=6`. Приход партии A, 20 шт., `received_at=T`. Приход партии B,
   `received_at=T+3d`. На момент `T+3d`: партия A → `days_left=3`, `status="critical"`;
   партия B → `days_left=6`, `status="warning"`. **Это основной сценарий, ради которого
   написан контракт** — у одного товара две партии с разными остатками дней одновременно.
2. Продажа 10 шт. товара из сценария 1 на `T+3d` → списывается с партии A (раньше истекает)
   первой: partition A `remaining_quantity` 20→10, партия B не тронута.
3. Продажа ещё 15 шт. → партия A списывается полностью (10→0, `status="consumed"`), остаток
   5 шт. списывается с партии B (15→10).
4. `shelf_life_days IS NULL` на товаре → приход не создаёт партию, `expiration_date` остаётся
   `null`, поведение как для обычного непортящегося товара.
5. `GET /main/products/{id}/` товара из сценария 1 на `T+3d` → `expiration_date` равен
   `expires_at` партии A (более ранняя из двух активных).
6. Партия с `expires_at < today`, `remaining_quantity > 0` → после ночного джоба
   `status="expired"`, `days_left` отрицательный.
7. Списание количества, превышающего сумму активных партий (расхождение с легаси-остатком) →
   партии обнуляются, **не** `400`/`500`.
8. `PATCH /main/products/{id}/` с `shelf_life_days=null` у товара с активными партиями → уже
   существующие партии не удаляются и не теряют свой `expires_at` (партия «заморожена» на
   момент создания); просто новые приходы перестают создавать партии.
9. `GET /main/products/{id}/expiry-batches/` для товара без партий → `200`, `results: []`
   (не `404`).

---

## 11. Контракт фронта (уже сделано, за флагом)

| Файл | Роль |
|---|---|
| `src/entities/product/lib/productExpiry.ts` | `isBatchExpiryEnabled`, `getBatchDaysLeft`, `getBatchExpiryStatus` — предпочитают `days_left` с бэка, считают сами только как fallback |
| `src/entities/product/api/products.ts` | `fetchProductExpiryBatchesApi` → `GET /main/products/{id}/expiry-batches/` |
| `src/features/warehouse-ops/ui/AddProductPage/utils/shelfLife.ts` | конвертация значение+единица (дни/месяцы) ↔ `shelf_life_days`, 1 месяц = 30 дней |
| `src/features/warehouse-ops/ui/AddProductPage/components/sections/ProductWarehouseSection.tsx` | форма товара: длительность хранения вместо абсолютной даты (за флагом) |
| `src/features/warehouse-ops/ui/AddProductPage/utils/productUtils.ts` | сборка payload: `shelf_life_days` вместо `expiration_date` за флагом |
| `src/features/warehouse-ops/ui/AddProductPage/hooks/useAddProductBootstrap.ts` | гидратация формы при редактировании/дублировании из `product.shelf_life_days` |
| `src/pages/warehouse/ui/components/ExpiryBatchHistory.tsx` + `ExpiryBatchTable.tsx` + `ExpiryBatchHistoryModal.tsx` | секция «Партии по сроку годности» на карточке товара — превью + пагинированный полный список |
| `.env.example` | `VITE_PRODUCT_BATCH_EXPIRY` |

### Поведение до выката BE

- Флаг выключен → форма показывает старое поле «дата», карточка товара не показывает секцию
  партий — поведение не меняется.
- Флаг включат раньше бэка → форма пошлёт `shelf_life_days`, бэк его проигнорирует как
  неизвестное поле (если явно не добавлено в сериализатор — обычно не ошибка, просто не
  сохранится); `GET /expiry-batches/` на `404/405` — секция на карточке товара не
  отображается (условие рендера — `product.shelf_life_days || expiry_batches.length`, оба
  будут пусты).

### Порядок выката

1. BE: миграция + `receive_stock`/`consume_stock` + эндпоинты §5 + тесты §10.
2. BE: деплой на staging.
3. FE: `VITE_PRODUCT_BATCH_EXPIRY=true` на staging → ручной прогон ровно сценария 1 из §10
   (главный кейс: две партии, разные остатки дней у одного товара).
4. Prod: BE + `VITE_PRODUCT_BATCH_EXPIRY=true` в один релиз.

---

## История

| Дата | Автор | Изменение |
|------|-------|-----------|
| 2026-09-11 | nur-market (FE/docs) | Первичный контракт; закрывает §7 `product-expiry-tracking-backend.md` выбором варианта B; FE реализован за флагом `VITE_PRODUCT_BATCH_EXPIRY` |
