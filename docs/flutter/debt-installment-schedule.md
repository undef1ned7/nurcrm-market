# Flutter: продажа в долг (v1 / v2)

Отсрочка на кассе: классический срок (v1) и график платежей (v2).

**Веб-экран:** `/crm/market/cashier` → оплата → «Отсрочка»  
**Веб-код:** `src/pages/cashier/ui/` + `src/entities/sale/lib/buildDebtSchedule.ts`  
**Переключатель:** `GET/PATCH /main/pos/cashier-settings/` → `debt_schedule_version`  
**Бэкенд-док:** [debt-installment-schedule-backend.md](../backend/kassa/debt-installment-schedule-backend.md)

**Статус:** веб готов.  
- **Бэкенд:** нет поля / `null` / не передали → **v1**.  
- **Веб nur-market:** нет поля в ответе настроек → **v2**. Явно `"v1"` → классика.

---

## 1. Две версии

| | **v1 — классика** | **v2 — график** |
|---|---|---|
| UI | Срок одной датой (N дней) + необязательная предоплата | Предоплата + N платежей по дням/месяцам + интервал |
| `debt_days` | Дней **до даты погашения** | Число **платежей** в дневном графике |
| Месяцы / интервал | нет | `debt_months`, `interval_days`, `interval_months` |
| `installments[]` | не слать | явный график с кассы |
| `kind` при предоплате | может быть `"prepayment"` | всегда `"debt"` |
| `schedule_version` | `"v1"` | `"v2"` |

Переключатель в Настройки → Касса (owner/admin). Кассиру тоже отдавать версию — от неё зависит UI.

---

## 2. Откуда брать версию

```dart
String resolveDebtScheduleVersion({
  required Map<String, dynamic>? cashierSettings,
  Map<String, dynamic>? company,
}) {
  final raw = cashierSettings?['debt_schedule_version'] ??
      cashierSettings?['deferred_schedule_version'] ??
      company?['debt_schedule_version'];

  if (raw == null) return 'v2'; // дефолт Flutter/веб маркета
  if (raw == 'v1' || raw == '1' || raw == 1) return 'v1';
  return 'v2';
}
```

Fallback, если `GET cashier-settings` недоступен: `company.debt_schedule_version`, иначе `v2`.  
Extra-поле не должно ломать старый бэк (не слать лишнего в PATCH, если бэк падает — см. cashier-settings).

Касса дублирует версию в `POST /deals/` как `schedule_version`.

---

## 3. Общий checkout

`POST /main/pos/sales/{id}/checkout/` **не меняется** для обеих версий:

```json
{
  "print_receipt": false,
  "client_id": 1842,
  "payment_method": "debt",
  "cash_received": "2000.00"
}
```

- Клиент обязателен.
- `cash_received` — предоплата, если есть.
- Неизвестный extra **не должен** давать 400.

Тариф «Старт»: после checkout — `POST /main/debts/` с `due_date` и `amount` = остаток.

- v1: `due_date` = единственная дата погашения.
- v2: `due_date` = дата **последнего** платежа.

---

## 4. v1 — классика

UI: чекбокс предоплаты, «Срок рассрочки (дней)», календарь одной даты.

```json
POST /main/clients/{id}/deals/
{
  "client": 1842,
  "title": "Долг Иван Петров",
  "kind": "debt",
  "amount": "10000.00",
  "prepayment": "2000.00",
  "debt_days": 30,
  "first_due_date": "2026-09-10",
  "auto_schedule": true,
  "schedule_version": "v1"
}
```

- Если `0 < prepayment < amount`, можно слать `kind: "prepayment"` (как веб сейчас).
- `debt_days` = календарные дни до погашения, **не** число взносов.
- `installments` / `interval_days` / `debt_months` **не слать**.

---

## 5. v2 — график

UI-поток:

1. Предоплата (опционально)
2. Режим: **дни** или **месяцы**
3. Число платежей
4. Интервал:
   - дни: каждый день / через день / через 3 / своё 1…30
   - месяцы: каждый месяц / раз в 2 / 3 / 6 / своё 1…12
5. Дата первого платежа
6. **Полный** превью-график (все платежи, скролл)

Всегда `kind: "debt"`. Предоплата — поле `prepayment`.

### По дням

```json
{
  "client": 1842,
  "title": "Долг Иван Петров",
  "kind": "debt",
  "amount": "10000.00",
  "prepayment": "2000.00",
  "debt_days": 4,
  "interval_days": 3,
  "first_due_date": "2026-08-13",
  "auto_schedule": true,
  "schedule_version": "v2",
  "installments": [
    { "number": 1, "amount": "2000.00", "due_date": "2026-08-13" },
    { "number": 2, "amount": "2000.00", "due_date": "2026-08-16" },
    { "number": 3, "amount": "2000.00", "due_date": "2026-08-19" },
    { "number": 4, "amount": "2000.00", "due_date": "2026-08-22" }
  ]
}
```

`interval_days` default `1`.

### По месяцам

**Не** конвертировать месяцы в дни × 30.

```json
{
  "client": 1842,
  "kind": "debt",
  "amount": "10000.00",
  "prepayment": "2000.00",
  "debt_months": 4,
  "interval_months": 1,
  "first_due_date": "2026-09-12",
  "auto_schedule": true,
  "schedule_version": "v2",
  "installments": [
    { "number": 1, "amount": "2000.00", "due_date": "2026-09-12" },
    { "number": 2, "amount": "2000.00", "due_date": "2026-10-12" },
    { "number": 3, "amount": "2000.00", "due_date": "2026-11-12" },
    { "number": 4, "amount": "2000.00", "due_date": "2026-12-12" }
  ]
}
```

Либо `debt_days`, либо `debt_months`, не оба.

---

## 6. Формула графика (клиент)

Веб: `buildDebtSchedule.ts`. Повторить 1:1.

```text
remaining = amount - prepayment   // в центах / тийинах
base = floor(remaining_cents / count)
последний платёж = base + remainder
```

`100.00 / 3` → `33.33 + 33.33 + 33.34`.

Даты:

- дни: `due_date[i] = first_due_date + i * interval_days`
- месяцы: `due_date[i] = first_due_date + i * interval_months` календарных месяцев;  
  31 янв + 1 мес = **28/29 фев**

```dart
class DebtInstallment {
  final int number;
  final String amount;   // "2000.00"
  final String dueDate;  // YYYY-MM-DD
}

List<DebtInstallment> buildDebtSchedule({
  required double amount,
  required double prepayment,
  required int count,
  required DateTime firstDueDate,
  int intervalDays = 1,
  int intervalMonths = 0, // >0 → месячный режим
});
```

Валидация UI до отправки:

- клиент выбран;
- `count >= 1`;
- `prepayment < amount` (если есть остаток в долг);
- не оба `debt_days` и `debt_months`.

---

## 7. Поля v2

| Поле | Тип | Обяз. | Смысл |
|---|---|---|---|
| `schedule_version` | `"v1"` \| `"v2"` | нет | нет → бэк считает v1 |
| `kind` | `"debt"` | да | всегда долг, если остаток > 0 |
| `amount` | decimal string | да | сумма чека |
| `prepayment` | decimal string | нет | предоплата сейчас |
| `debt_days` | int ≥ 1 | XOR | число платежей (дни) |
| `interval_days` | int ≥ 1 | нет | шаг; default 1 |
| `debt_months` | int ≥ 1 | XOR | число платежей (месяцы) |
| `interval_months` | int ≥ 1 | нет | шаг; default 1 |
| `first_due_date` | `YYYY-MM-DD` | да | дата 1-го платежа |
| `auto_schedule` | bool | да | `true` |
| `installments` | array | нет | приоритетнее автогенерации |
| `sale_id` | — | **не слать** | POS id ≠ Sale в deals → 400 |

Неизвестные поля на бэке не должны давать 400.

### Checkout v2 (желательно, не блокер)

Дополнительно в checkout (extra):

```json
{
  "payment_method": "debt",
  "client_id": 1842,
  "cash_received": "2000.00",
  "schedule_version": "v2",
  "debt_schedule": {
    "unit": "month",
    "count": 4,
    "interval_months": 1,
    "first_due_date": "2026-09-12",
    "installments": []
  }
}
```

Deal создаётся **отдельным** `POST /main/clients/{id}/deals/` после checkout.

---

## 8. Ошибки

| Случай | HTTP | UI |
|---|---|---|
| нет клиента | 400 | «Выберите клиента» |
| и days, и months | 400 | показать `detail` |
| `prepayment >= amount` | 400 | валидация до отправки |
| сумма installments ≠ остаток | 400 | пересчитать график |
| неизвестное поле | не 400 | — |

---

## 9. Вне scope (не делать в v1 UI)

- Редактирование отдельных дат/сумм в таблице (только превью + first due + интервал).
- Проценты / проценты.
- График в ESC/POS чеке.

---

## 10. Чеклист Flutter

- [ ] Читать `debt_schedule_version` из cashier-settings
- [ ] Нет поля → UI v2; явно `"v1"` → классика
- [ ] v1: один срок, без installments
- [ ] v2: дни/месяцы, превью всех платежей, `installments[]` в deals
- [ ] Формула копеек и календарных месяцев как на вебе
- [ ] Не слать `sale_id` POS-корзины в deals
- [ ] Checkout + отдельный POST deals
- [ ] Тариф «Старт»: POST `/main/debts/` с due_date последнего платежа (v2)
