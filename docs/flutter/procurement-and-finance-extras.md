# Flutter: закупки batch-приход, цена продажи при приходе, разбивка «Прочих расходов»

Три независимых мини-контракта, не покрытых другими доками закупок/финансов: пакетный приход товара с карточки склада (без отдельной страницы), автопересчёт розничной цены по наценке при приходе, и детализация статьи «Прочее» в аналитике «Финансы».

**Веб-экраны:**
- `/crm/sklad/{productId}` → модалка «Добавление товара» (`AddProductModal.tsx`) — раздел 1
- `/crm/market/procurement/receipt` — приход от поставщика (пересчёт цены) — раздел 2
- `/crm/market/analytics` → таб «Финансы» — раздел 3

**Веб-код (эталон):**
- `AddProductModal.tsx` — ветвление receipt vs direct PATCH
- `src/pages/warehouse/ui/supplierReceipt/hooks/useSupplierReceipt.tsx` — приход, наценка
- `src/pages/analytics/ui/hooks/analytics/useAnalyticsTabData.ts` — `financeData`, фильтр «Прочее»

**Бэкенд-доки:**
- [quick-restock-purchase-batch-backend.md](../backend/kassa/quick-restock-purchase-batch-backend.md)
- [supplier-receipt-selling-price-backend.md](../backend/kassa/supplier-receipt-selling-price-backend.md)
- [finance-other-expenses-breakdown-backend.md](../backend/kassa/finance-other-expenses-breakdown-backend.md)

**Статус:**

| Раздел | Бэкенд | Веб | Flutter |
|--------|--------|-----|---------|
| 1. Приход с карточки товара (batch) | Эндпоинт `receipt/` уже существует и используется; **нужно подтверждение** по 4 пунктам (см. §1.4) — не заявлено как «готово» | Реализовано (fallback на direct PATCH без поставщика) | Реализовать по этому доку |
| 2. Пересчёт цены продажи по наценке | ⚠️ **Требуется правка на бэкенде** — не реализовано | Не патчит цену, ждёт пересчёт от бэка | Не слать `price`/`markup_percent` в приходе; ждать пересчитанный `price` в ответе/GET |
| 3. Разбивка «Прочие расходы» | **Требуется реализация** — поле `category` отсутствует | Реализовано best-effort (KPI работает, таблица детализации пустая) | Реализовать KPI сразу; таблицу детализации — после появления `category` на бэке |

Базовый префикс: `{host}/api`. Не использовать `/api/v1`. Таймзона: **Asia/Bishkek (UTC+6)**. Суммы — decimal-строки.

---

## Содержание

1. [Приход товара с карточки склада (batch)](#1-приход-товара-с-карточки-склада-batch)
2. [Пересчёт цены продажи по наценке при приходе](#2-пересчёт-цены-продажи-по-наценке-при-приходе)
3. [Разбивка «Прочие расходы» в аналитике «Финансы»](#3-разбивка-прочие-расходы-в-аналитике-финансы)
4. [Чеклист Flutter](#4-чеклист-flutter)

---

## 1. Приход товара с карточки склада (batch)

### 1.1 Контекст

Модалка «Добавление товара» на карточке склада исторически делала прямой `PATCH /main/products/{id}/` — это **не** попадало в «Историю закупок», т.к. история (`product.purchase_batches`) заполняется только эндпоинтом прихода. Фронт исправлен: теперь ветвится по наличию выбранного поставщика.

### 1.2 Поставщик выбран → идёт через приход (тот же контракт, что «Приход от поставщика»)

```http
POST /main/suppliers/{supplier_id}/receipt/
```

```json
{
  "items": [
    { "product": "<productId>", "qty": 100, "purchase_price": 50 }
  ],
  "payment_type": "cash"
}
```

| Поле | Тип | Правило |
|------|-----|---------|
| `items` | array | этот флоу с карточки шлёт **один** элемент; эндпоинт тот же, что мульти-приход |
| `items[].product` | uuid | обязателен |
| `items[].qty` | number | > 0 |
| `items[].purchase_price` | number | ≥ 0 |
| `payment_type` | enum | `cash` \| `debt` \| `prepayment` |

Плюс маршрутизация кассы `buildExpenseVariableRouting()` при `cash`/`prepayment` (см. [cash-and-cashflows.md](./cash-and-cashflows.md) §5).

**Атомарность:** приход должен в одной операции обновить остаток, `purchase_price`, создать партию (`purchase_batches`) и — если есть наценка — пересчитанную `price` (см. раздел 2). Партиального результата (остаток обновлён, партия — нет) быть не должно.

### 1.3 Розничная цена — отдельным PATCH после прихода

Приход **не принимает** `price` (пересчитывает сам по `markup_percent`, см. раздел 2). Если пользователь в форме ввёл свою розничную цену — она фиксируется отдельным partial-PATCH сразу после прихода:

```http
PATCH /main/products/{productId}/
```

```json
{ "price": "<retailPrice>", "client": "<supplierId>" }
```

Только эти два поля. PATCH должен менять **только** переданные поля и не сбрасывать `quantity`/`purchase_price`, только что установленные приходом.

### 1.4 Не подтверждено бэком (проверить перед реализацией на Flutter)

Как заявлено в исходном доке — это открытые вопросы к бэкенду, не факты:

1. Ответ `POST .../receipt/` содержит `id`/`uuid` верхнего уровня — используется как `receiptId` → `source_cashbox_flow_id` в cashflow. Точное имя поля не подтверждено.
2. `items` с одной позицией должен обрабатываться так же, как мульти-приход (остаток +qty, партия создаётся) — не подтверждено явно.
3. Гонка `receipt` → `PATCH {price, client}`: partial-PATCH не должен затирать `quantity`/`purchase_price`, только что записанные приходом — стандартное поведение PATCH, но сценарий ранее не тестировался.
4. `PATCH { client: supplierId }` — не ясно, не дублирует ли это то, что приход и так пишет в `Product.client`/партию.

### 1.5 Поставщик не выбран → без прихода (осознанно, не баг)

```json
PATCH /main/products/{id}/
{ "quantity": "<newQty>", "purchase_price": "<price>", "price": "<retailPrice>" }
```

Не попадает в «Историю закупок» — это осознанный «быстрый» путь корректировки остатка без бухгалтерского следа. Открытый (нерешённый) продуктовый вопрос: такой путь никак не аудируется на бэке (кроме `updated_at` товара). Решения нет — если бэк позже введёт `manual-restock` эндпоинт или лёгкий аудит-лог, это будет отдельный контракт.

### 1.6 Cashflow / долг — без изменений от общей матрицы

| `payment_type` | Cashflow / долг |
|---|---|
| `cash` | expense `procurement_receipt` (или `warehouse_purchase` — см. матрицу в [cash-and-cashflows.md](./cash-and-cashflows.md) §7) |
| `debt` | `cashflows: []`; запись в `/main/debts/` (тариф «Старт») + сделка |
| `prepayment` | cashflow на сумму предоплаты, `source_cashbox_flow_id = receiptId`; остаток долга — в сделке |

---

## 2. Пересчёт цены продажи по наценке при приходе

### 2.1 Статус

⚠️ **Не реализовано на бэке.** Фронт **уже** не шлёт `price`/`markup_percent` и не делает `PATCH` после прихода — контракт запроса менять не будут, ждут пересчёт внутри `POST .../receipt/`.

### 2.2 Проблема

Приход меняет `purchase_price`, но `product.price` (розница) не пересчитывается — хотя у товара есть `markup_percent`. Маржа падает молча.

### 2.3 Запрос (уже так, не менять)

```http
POST /main/suppliers/{supplier_id}/receipt/
```

```json
{
  "items": [
    { "product": "<uuid>", "qty": 100, "purchase_price": 120 }
  ],
  "payment_type": "cash"
}
```

Flutter **не** шлёт `items[].price` и `items[].markup_percent` — бэк должен взять `markup_percent` с карточки товара **до** обновления закупки.

### 2.4 Ожидаемая формула на бэке (для справки, не реализовывать на клиенте — это серверный расчёт)

```text
если markup_percent есть и ≥ 0, и purchase_price ≥ 0:
    selling = purchase_price * (1 + markup_percent / 100)
    product.price = round(selling * 100) / 100   // 2 знака
иначе:
    price не меняется
markup_percent НЕ пересчитывается из старой продажи — берётся исходный, до записи новой закупки
```

Пример: было `purchase_price=100, markup=10%, price=110`; приход `purchase_price=120` → ожидается `price=132` (не 110).

Всё в одной транзакции с остатком и себестоимостью — частичный результат (закупка есть, цена не пересчиталась) недопустим.

### 2.5 Что видит Flutter после успеха

После `200` на `POST .../receipt/`, повторный `GET /main/products/{id}/` должен вернуть уже пересчитанную `price` — **без** дополнительного `PATCH` от клиента. Пока это не реализовано на бэке — розничная цена после прихода с наценкой останется старой (известный баг, не ждать `price` в ответе прихода).

### 2.6 Что не трогает эта фича

- `wholesale_price` — не пересчитывается этим контрактом.
- Существующие остатки по старой цене — приход не создаёт отдельные партии по разным ценам продажи (нет weighted-average/FIFO механики продаж, описанной в доке) — пересчитывается единая `product.price` на карточке товара.

---

## 3. Разбивка «Прочие расходы» в аналитике «Финансы»

### 3.1 Статус

- **Фронт:** реализовано best-effort — карточка KPI работает уже сегодня; таблица детализации по операциям пока пустая.
- **Бэк:** **требуется реализация** — поле `category` на уровне отдельной операции не заявлено.

Общий контракт вкладки `tab=finance` — см. [analytics.md](./analytics.md). Этот раздел — только про недостающую детализацию статьи «Прочее».

### 3.2 Модель уже сегодня (без бэка)

В ответе `tab=finance` уже есть:
- `tables.expense_breakdown[]` — статья → сумма → кол-во операций (агрегат, статья «Прочее» уже там есть, менять не будут).
- `tables.expense_items[]` — плоский список расходных операций периода (без поля статьи).

KPI-карточка «Прочие расходы» берёт сумму по приоритету:

```text
cards.other_expense_total  →  строка expense_breakdown, name == "Прочее"  →  сумма отфильтрованных expense_items
```

Таблица детализации фильтрует `expense_items[]` по цепочке фолбэков `category ?? business_operation ?? business_operation_name ?? source_business_operation_id ?? article ?? name`, сравнивая case-insensitive с `"прочее" | "прочие расходы" | "other"`. Поскольку `expense_items[].name` сейчас содержит конкретное описание операции (например, «Закупка запчастей для кассового аппарата»), а не статью — фильтр **не срабатывает**, таблица остаётся пустой до появления `category`.

### 3.3 Чего не хватает от бэка

Поле `category` на каждой строке `expense_items[]` (и симметрично `income_items[]`, впрок):

```json
{
  "id": "93f5e34a-b414-41df-b59f-01231af...",
  "name": "Закупка запчастей для кассового аппарата",
  "category": "Прочее",
  "amount": "1500.00",
  "cashbox": "Основная касса",
  "created_at": "2026-09-04T10:12:00+06:00",
  "created_by": "Айбек",
  "description": "Ремонт принтера чеков"
}
```

Опционально: явное `cards.other_expense_total` — точнее, чем вывод суммы из текстовой метки строки `expense_breakdown`.

### 3.4 Это read-only отчётность, без своего CRUD

Раздел **не** вводит отдельные эндпоинты создания/редактирования — это чисто аналитическая детализация существующих cashflow-операций категории «Прочее» (`source_kind`/`source_business_operation_id` из общей модели cashflow, см. [cash-and-cashflows.md](./cash-and-cashflows.md) §2.2). Редактирование/отмена самой операции — по общему контракту [cashflow-edit-cancel-request-backend.md](../backend/kassa/cashflow-edit-cancel-request-backend.md), не по этому доку.

### 3.5 Dart

```dart
class FinanceExpenseItem {
  final String id;
  final String name;
  final String? category; // может отсутствовать до апдейта бэка
  final String amount;
  final String? cashbox;
  final DateTime? createdAt;
  final String? createdBy;
  final String? description;
}

bool isOtherCategory(FinanceExpenseItem item) {
  final raw = (item.category ?? item.name).trim().toLowerCase();
  return raw == 'прочее' || raw == 'прочие расходы' || raw == 'other';
}
```

Пока `category` не пришёл от бэка — фильтровать по `item.category`, а не по совпадению `name` (иначе ложные срабатывания на операциях с похожим текстом описания).

---

## 4. Чеклист Flutter

### Приход с карточки склада (batch)

- [ ] Поставщик выбран → `POST .../receipt/` (один item) вместо `PATCH quantity`
- [ ] После прихода — отдельный `PATCH { price, client }`, только эти два поля
- [ ] Поставщик не выбран → прежний прямой `PATCH { quantity, purchase_price, price }`, без записи в «Историю закупок» (ожидаемо)
- [ ] `payment_type: debt` → без cashflow, запись в `/main/debts/` + сделка
- [ ] `payment_type: prepayment` → cashflow на сумму предоплаты, `source_cashbox_flow_id = receiptId`
- [ ] Не полагаться на конкретное имя поля id прихода без проверки на актуальном бэке (см. §1.4 п.1)

### Пересчёт цены продажи

- [ ] Не слать `items[].price` и `items[].markup_percent` в `POST .../receipt/`
- [ ] После прихода не делать `PATCH` цены самостоятельно — ждать пересчитанный `price` от бэка
- [ ] Пока бэк не реализовал пересчёт — розничная цена после прихода может остаться старой (известное расхождение, не баг клиента)
- [ ] `wholesale_price` этим контрактом не меняется

### Разбивка «Прочие расходы»

- [ ] KPI «Прочие расходы» — можно показывать уже сейчас (`cards.other_expense_total` → `expense_breakdown` → сумма отфильтрованных `expense_items`)
- [ ] Таблица детализации — фильтр по `item.category`, с фолбэком на старые поля только если `category` отсутствует
- [ ] Не показывать пустую таблицу как ошибку — это ожидаемо до апдейта бэка
- [ ] Это read-only отчётность — CRUD статьи «Прочее» нет, редактирование операции — через общий cashflow edit/cancel контракт

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [procurement-history-returns.md](./procurement-history-returns.md) | История приходов, возвраты поставщику |
| [procurement-recommendations.md](./procurement-recommendations.md) | Рекомендуемый заказ |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Кассы, cashflows, смены |
| [analytics.md](./analytics.md) | Общий контракт аналитики (`tab=finance` и другие) |
</content>
