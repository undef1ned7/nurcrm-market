# Flutter / другой фронт: долг и карточки клиента

Детальный просмотр клиента: KPI-карточки сверху, список сделок, модалка долга с графиком и оплатой.

**Веб-экран:** `/crm/clients/:id`  
**Веб-код:** `src/pages/clients/ui/ClientDetails/`  
**Связанные доки:**
- KPI для бэка: [client-kpis-backend.md](../backend/client-kpis-backend.md)
- Создание долга с кассы: [debt-installment-schedule.md](./debt-installment-schedule.md)
- Бэк кассы/графика: [debt-installment-schedule-backend.md](../backend/kassa/debt-installment-schedule-backend.md)

**Статус:** веб готов. KPI-эндпоинт может ещё отсутствовать — тогда суммы считают по списку deals (формула ниже).

Базовый префикс: `{host}/api` + `/main/...`.  
Авторизация: `Authorization: Bearer <accessToken>`.  
Таймзона: **Asia/Bishkek, UTC+6**. Валюта в UI: сом.

---

## 1. Карта экрана

```text
┌─────────────────────────────────────────────┐
│ Header: ФИО, статус, кнопки                 │
│   + Добавить сделку | Акт сверки | Редакт.  │
├─────────────────────────────────────────────┤
│ KPI-карточки (3 шт., всегда все время)      │
│   Общий долг | Аванс | Продажи              │
├─────────────────────────────────────────────┤
│ Профиль / реквизиты                         │
├─────────────────────────────────────────────┤
│ Фильтр дат (только на список сделок)        │
├─────────────────────────────────────────────┤
│ Список сделок                               │
│   клик по kind=debt → DebtModal             │
├─────────────────────────────────────────────┤
│ История POS-продаж (отдельный блок)         │
└─────────────────────────────────────────────┘
```

Важно:

- KPI **не** зависят от фильтра дат — это итог по клиенту целиком.
- POS-чеки (`GET /main/pos/sales/?client=`) в KPI **не входят**.
- Клик по сделке `kind=debt` открывает модалку долга. Остальные kinds — только редактирование через «карандаш», без DebtModal.

---

## 2. Загрузка экрана

Параллельно (или последовательно) при открытии клиента:

| # | Запрос | Зачем |
|---|---|---|
| 1 | `GET /main/clients/{id}/` | карточка клиента (если нет в state) |
| 2 | `GET /main/clients/{id}/deals/` | список сделок |
| 3 | `GET /main/clients/{id}/kpis/` | KPI-карточки |
| 4 | `GET /main/pos/sales/?client={id}&page=1&limit=100` | история чеков (отдельный блок) |

После create/update/delete/pay/refund сделки:

1. обновить список deals;
2. **перезапросить KPI** (`GET .../kpis/` или пересчитать фолбэк).

---

## 3. KPI-карточки

### 3.1 UI

Три кнопки-карточки:

| Ключ | Label (магазин) | i18n | Сумма | Счётчик |
|---|---|---|---|---|
| `debt` | Общий долг | `clients.kpi.debt` | `debt.amount` | `debt.count` + `clients.kpi.dealsCount` |
| `prepayment` | Аванс | `clients.kpi.prepayment` | `prepayment.amount` | `prepayment.count` |
| `sale` | Продажи | `clients.kpi.sale` | `sale.amount` | `sale.count` |

Клик по карточке открывает drawer/sheet со списком сделок этой категории (фильтр локально по уже загруженным `deals`).

Сектор «Строительная компания» на вебе меняет подписи (договор / предоплата / остаток) и местами меняет `debt` ↔ `sale`. Для маркета ориентируйтесь на таблицу выше.

### 3.2 API (предпочтительно)

```http
GET /main/clients/{client_id}/kpis/
Authorization: Bearer <access_token>
```

Ответ:

```json
{
  "debt": { "amount": "1200.50", "count": 2 },
  "prepayment": { "amount": "300.00", "count": 1 },
  "sale": { "amount": "4500.00", "count": 4 }
}
```

- `amount` — decimal-строка с 2 знаками (`"0.00"`).
- `count` — int ≥ 0.
- Всегда все три ключа. Нет сделок → нули.
- Допустима обёртка `{ "kpis": { ... } }` — парсер должен понимать оба варианта.

### 3.3 Fallback, если `/kpis/` нет

При `404` / `405` / сеть — считать по массиву deals **той же формулой**, что бэк:

`kind`: `"debt"` | `"prepayment"` | `"sale"`. Нет `kind` → `"sale"`.

```dart
ClientKpis aggregateFromDeals(List<Deal> deals) {
  var debtAmount = 0.0, debtCount = 0;
  var prepAmount = 0.0, prepCount = 0;
  var saleAmount = 0.0, saleCount = 0;

  for (final d in deals) {
    final kind = (d.kind ?? 'sale').toLowerCase();
    if (kind == 'debt') {
      debtAmount += parseMoney(d.remainingDebt);
      debtCount += 1;
      final prepaid = parseMoney(d.prepayment);
      if (prepaid > 0) {
        prepAmount += prepaid;
        prepCount += 1;
      }
    } else if (kind == 'prepayment') {
      prepAmount += parseMoney(d.amount);
      prepCount += 1;
    } else {
      saleAmount += parseMoney(d.amount);
      saleCount += 1;
    }
  }

  return ClientKpis(
    debt: KpiBucket(amount: round2(debtAmount), count: debtCount),
    prepayment: KpiBucket(amount: round2(prepAmount), count: prepCount),
    sale: KpiBucket(amount: round2(saleAmount), count: saleCount),
  );
}
```

| Карточка | Сумма | Count |
|---|---|---|
| Долг | сумма `remaining_debt` по `kind=debt` | число таких сделок |
| Аванс | `prepayment` с долгов (если > 0) + `amount` сделок `kind=prepayment` | число сделок, вошедших в сумму |
| Продажи | `amount` по `kind=sale` | число таких сделок |

Не путать: у долга в «Аванс» идёт поле `prepayment`, не весь `amount`.  
`remaining_debt` — остаток после оплат, не исходный `amount`.

### 3.4 Drawer по клику на KPI

Фильтр локально:

| View | Какие deals |
|---|---|
| `debt` | `kind == "debt"`; в списке сумма = `remaining_debt` |
| `prepayment` | `kind == "prepayment"` **или** `prepayment > 0`; сумма = `amount` (prepayment-kind) или `prepayment` (debt) |
| `sale` | `kind == "sale"` (и всё остальное не debt/prepayment); сумма = `amount` |

Сортировка: по дате убыванию (`date` / `created_at` / `updated_at`).

---

## 4. Список сделок

```http
GET /main/clients/{id}/deals/
```

Ответ: массив или `{ "results": [...] }`.

Минимальные поля сделки для UI:

| Поле | Тип | Смысл |
|---|---|---|
| `id` | uuid/int | PK |
| `title` | string | название |
| `kind` | `debt` \| `prepayment` \| `sale` | тип |
| `amount` | decimal | сумма сделки |
| `prepayment` | decimal | предоплата (у долга) |
| `remaining_debt` | decimal | остаток долга |
| `debt_amount` | decimal | размер долга (часто = amount) |
| `debt_days` | int? | срок/число платежей (см. v1/v2) |
| `debt_months` | int? | месячный график |
| `first_due_date` | `YYYY-MM-DD`? | первый платёж |
| `daily_payment` / `monthly_payment` | decimal? | ориентир платежа |
| `installments` | array | график (на detail обычно полнее) |
| `payments` | array | история оплат |
| `created_at` / `updated_at` | datetime | даты |
| `client_full_name` | string? | ФИО |

Фильтр дат на экране режет **только** этот список, не KPI.

Клик:

- `kind == "debt"` → открыть DebtModal / detail sheet;
- иначе — не открывать DebtModal (редактирование через форму сделки).

Прогресс долга в списке (веб):

```text
paid = amount - remaining_debt  (или prepayment, если remaining нет)
percent = paid / amount * 100
```

---

## 5. Модалка / экран долга

### 5.1 Открытие

```http
GET /main/clients/{clientId}/deals/{dealId}/
```

Параллельно: `GET` касс (cashboxes) для оплаты.

### 5.2 Шапка summary

| Блок | Поле |
|---|---|
| Размер долга | `debt_amount` ?? `amount` |
| Остаток долга | `remaining_debt` |
| Ежедневный / периодный платёж | `daily_payment` ?? `monthly_payment` (в режиме edit на вебе считают `amount / debt_days`) |

### 5.3 Info-grid

| Label | Значение |
|---|---|
| ФИО | `client_full_name` |
| Название сделки | `title` |
| Размер долга | `debt_amount` / `amount` (editable до первых оплат) |
| Срок долга (дней) | `debt_days` ?? `debt_months` (на вебе months×30 только для отображения edit-поля) |
| Дата первого платежа | `first_due_date` → `DD.MM.YYYY` |
| Предоплата | `prepayment`, если не `"0.00"` |
| Заметки | `note`, на всю ширину |

Верстка: не 2 колонки с обрезанным 5-м полем. На широком экране удобно **3 колонки**, на узком — 1–2.

### 5.4 График платежей (`installments[]`)

Элемент графика (типичные поля):

| Поле | Смысл |
|---|---|
| `id` | id взноса (для pay/refund) |
| `number` | № платежа |
| `due_date` | срок |
| `amount` | сумма взноса |
| `paid_amount` | уже оплачено |
| `paid_on` | дата полной оплаты (truthy → полностью оплачен) |
| `remaining_for_period` | legacy-остаток (если нет `paid_amount`) |

Статус взноса (как на вебе):

```dart
InstallmentStatus statusOf(Installment p) {
  final paid = parseMoney(p.paidAmount);
  final amount = parseMoney(p.amount);
  if (p.paidOn != null) return InstallmentStatus.paid;      // Полностью оплачен
  if (paid > 0 && paid < amount) return InstallmentStatus.partial; // Частично
  final due = (p.dueDate ?? '').substring(0, min(10, ...));
  if (due.isNotEmpty && due.compareTo(todayIso()) < 0) {
    return InstallmentStatus.overdue; // Просрочен
  }
  return InstallmentStatus.unpaid; // Не оплачен
}

double remainingOf(Installment p) {
  if (p.paidOn != null) return 0;
  final amount = parseMoney(p.amount);
  final paid = parseMoney(p.paidAmount);
  // legacy:
  if (p.remainingForPeriod != null && p.paidAmount == null) {
    return max(0, parseMoney(p.remainingForPeriod));
  }
  return max(0, amount - paid);
}
```

Колонки таблицы: №, Срок, Сумма, Остаток, Статус, Оплачен, Сумма оплаты, действия.

### 5.5 Редактирование сделки

Флаг «уже были оплаты»:

```dart
bool dealHasPayments(Deal d) {
  if ((d.payments ?? []).isNotEmpty) return true;
  return (d.installments ?? []).any(
    (i) => i.paidOn != null || parseMoney(i.paidAmount) > 0,
  );
}
```

- **Были оплаты** → можно править только `title` и `note`.
- **Не было** → можно `amount`, `debt_days`, `first_due_date`, плюс правку строк `installments[]` (amount/due_date) с `auto_schedule: true`.

```http
PATCH /main/clients/{clientId}/deals/{dealId}/
```

```json
{
  "title": "...",
  "note": "...",
  "amount": 263.0,
  "debt_days": 3,
  "first_due_date": "2026-09-12",
  "auto_schedule": true,
  "installments": [
    { "number": 1, "amount": "87.67", "due_date": "2026-09-12" }
  ]
}
```

Удаление:

```http
DELETE /main/clients/{clientId}/deals/{dealId}/
```

После успеха — закрыть модалку, обновить deals + KPI.

### 5.6 Оплата взноса

```http
POST /main/clients/{clientId}/deals/{dealId}/pay/
```

```json
{
  "idempotency_key": "<uuid>",
  "installment_id": "<installment uuid>",
  "date": "2026-08-13",
  "note": "",
  "amount": "50.00"
}
```

Правила веб-фронта:

1. Всегда слать новый `idempotency_key` (UUID).
2. `installment_id` = `installments[].id` (не `number`).
3. Если взнос уже `paid_on` — не слать pay.
4. Сумма оплаты ≤ остаток взноса.
5. Если оплачивают **весь** остаток — поле `amount` **можно не слать**.
6. Если **частичная** оплата — слать `amount` строкой `"50.00"`.
7. После успеха: `GET` detail сделки заново + обновить список/KPI на карточке.
8. Параллельно веб пишет cashflow в кассу (`income` для клиента, `expense` для поставщика) — на мобиле повторите, если у вас есть тот же cash API.

### 5.7 Возврат оплаты

```http
POST /main/clients/{clientId}/deals/{dealId}/refund/
```

```json
{
  "idempotency_key": "<uuid>",
  "installment_id": "<installment uuid>",
  "amount": "50.00"
}
```

`amount` опционален: без него — возврат всего оплаченного по взносу. Только если `paid_amount > 0`.

---

## 6. Создание долга (не с карточки, с кассы)

На карточке клиента долг обычно уже есть (создан с кассы/формы). Создание с POS — отдельный флоу, см. [debt-installment-schedule.md](./debt-installment-schedule.md).

Кратко:

1. `POST /main/pos/sales/{id}/checkout/` с `payment_method: "debt"`.
2. Затем `POST /main/clients/{id}/deals/` с `schedule_version` v1 или v2.
3. **Не слать** POS `sale_id` корзины в deals — бэк отвечает `400 {"sale_id":["Указанная продажа не найдена."]}`.

После создания с кассы карточка клиента при следующем открытии/refresh должна увидеть новый долг в deals и KPI.

---

## 7. Модели (Dart, ориентир)

```dart
class KpiBucket {
  final double amount;
  final int count;
  const KpiBucket({required this.amount, required this.count});
}

class ClientKpis {
  final KpiBucket debt;
  final KpiBucket prepayment;
  final KpiBucket sale;
}

class Deal {
  final String id;
  final String title;
  final String kind; // debt | prepayment | sale
  final double amount;
  final double prepayment;
  final double remainingDebt;
  final double? debtAmount;
  final int? debtDays;
  final int? debtMonths;
  final String? firstDueDate;
  final List<Installment> installments;
  final List<dynamic> payments;
  final String? clientFullName;
  final String? note;
  final String? createdAt;
}

class Installment {
  final String? id;
  final int number;
  final String dueDate;
  final double amount;
  final double paidAmount;
  final String? paidOn;
}
```

Парсер KPI: принимайте и nested buckets, и flat-алиасы (`remaining_debt` + `debt_count` и т.п.) — веб так делает в `mapClientKpis`.

---

## 8. Чеклист приёмки (другой фронт)

**Карточка клиента**

- [ ] Три KPI всегда на экране; нули при отсутствии сделок.
- [ ] При живом `/kpis/` — цифры с бэка; при 404 — фолбэк по deals той же формулой.
- [ ] Фильтр дат не меняет KPI.
- [ ] POS-продажи не попадают в KPI.
- [ ] После pay/refund/save/delete — deals и KPI обновляются.

**Список**

- [ ] Клик по `kind=debt` открывает detail долга.
- [ ] У долга виден остаток / прогресс.

**Debt detail**

- [ ] Summary: размер / остаток / периодный платёж.
- [ ] Info-grid без обрезания «Даты первого платежа».
- [ ] Таблица installments со статусами paid/partial/overdue/unpaid.
- [ ] Pay с `idempotency_key` + `installment_id`; частичная оплата шлёт `amount`.
- [ ] Refund только если есть `paid_amount`.
- [ ] Edit amount/days/schedule — только пока не было оплат.

---

## 9. Что не делать

- Не суммировать KPI из пагинированной «текущей страницы» deals — либо `/kpis/`, либо полный список.
- Не подмешивать `/main/pos/sales/` в карточки долг/аванс/продажи.
- Не передавать id POS-корзины как `sale_id` в deals.
- Не открывать DebtModal для `sale` / `prepayment` как для долга (у них другой UX).
- Не менять URL на `/api/v1/...`.
