# Маркет — продажа в долг: v1 и v2

**Экран:** `/crm/market/cashier` → оплата → «Отсрочка»  
**Фронт:** `src/pages/cashier/ui/` + `src/entities/sale/lib/buildDebtSchedule.ts`  
**Переключатель:** `GET/PATCH /main/pos/cashier-settings/` → `debt_schedule_version`  
**Статус:** фронт готов. **Бэкенд:** нет поля / `null` / не передали → **v1**. **Фронт nur-market:** касса читает поле из настроек; нет поля → **v2**. Версию меняют в Настройки → Касса.

Связанные эндпоинты:

| Метод         | Путь                                 | Зачем                                     |
| ------------- | ------------------------------------ | ----------------------------------------- |
| `GET`/`PATCH` | `/main/pos/cashier-settings/`        | `debt_schedule_version`: `"v1"` \| `"v2"` |
| `POST`        | `/main/pos/sales/{id}/checkout/`     | закрытие чека, `payment_method: "debt"`   |
| `POST`        | `/main/clients/{id}/deals/`          | создать сделку-долг                       |
| `GET`         | `/main/clients/{id}/deals/{dealId}/` | карточка долга                            |
| `PATCH`       | `/main/clients/{id}/deals/{dealId}/` | правка до первых оплат                    |
| `POST`        | `/main/debts/`                       | fallback тарифа «Старт»                   |

---

## Зачем две версии

|                       | **v1 — классика**                                     | **v2 — график**                                    |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| UI                    | Срок одной датой (N дней) + необязательная предоплата | Предоплата + N платежей по дням/месяцам + интервал |
| `debt_days`           | Дней **до даты погашения** (один срок)                | Число **платежей** в дневном графике               |
| Месяцы / интервал     | нет                                                   | `debt_months`, `interval_days`, `interval_months`  |
| `installments[]`      | не шлём                                               | явный график с кассы                               |
| `kind` при предоплате | может быть `"prepayment"`                             | всегда `"debt"`                                    |
| `schedule_version`    | `"v1"`                                                | `"v2"`                                             |

**Бэкенд default: `v1`.** Нет `debt_schedule_version` / `null` / мусор / не передали в PATCH → **v1**.  
То же для `POST /deals/`: нет `schedule_version` → считать v1, старый payload и старое поведение.

**Фронт nur-market** читает `debt_schedule_version` из настроек кассы и рисует v1 или v2. Нет поля на фронтовом дефолте → v2. Переключатель: Настройки → Касса.

---

## Переключатель

Поле singleton-настроек кассы (см. [cashier-settings.md](./cashier-settings.md)):

```json
{ "debt_schedule_version": "v1" }
```

- Кассиру тоже отдавать (нужно выбрать UI).
- **Бэкенд:** нет поля / `null` / мусор → **v1**. Явно `"v2"` / `"2"` → график.
- **Фронт nur-market:** явно `"v1"` / `"1"` → классика, иначе v2. Меняется через PATCH настроек кассы.
- Алиас, который фронт тоже поймёт: `deferred_schedule_version`.
- Fallback, если `GET cashier-settings` недоступен: `company.debt_schedule_version`, иначе v2.
- Extra-поле не должно давать 400 на старом бэке.

Касса дублирует версию в `POST /deals/` как `schedule_version`, чтобы deals не гадал по набору полей.

---

## Общее для v1 и v2

Checkout не меняется:

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
- Неизвестный extra **не 400**.

Тариф «Старт»: касса по-прежнему делает `POST /main/debts/` с `due_date` и `amount` = остаток.  
v1: `due_date` = единственная дата погашения.  
v2: `due_date` = дата **последнего** платежа.

---

## v1 — классическая отсрочка (без изменений)

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

Если предоплата `0 < prepayment < amount`, фронт может послать `kind: "prepayment"` (как сейчас).  
`debt_days` = число календарных дней до погашения, **не** число ежедневных взносов.  
`installments` / `interval_days` / `debt_months` **не слать**.

Поведение deals для v1 **не менять**.

---

## v2 — график платежей

UI: предоплата → дни или месяцы → интервал (для дней: каждый день / через день / через 3 / своё 1…30; для месяцев: каждый месяц / раз в 2 / 3 / 6 / своё 1…12) → дата первого платежа → **полный** превью-график (все платежи, скролл).

Касса всегда шлёт `kind: "debt"`. Предоплата — поле `prepayment`.

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

`interval_days` default `1`. `2` — через день, `3` — каждые 3 дня.

### По месяцам

**Не конвертировать месяцы в дни × 30.**

`interval_months` default `1`. `2` — раз в два месяца.

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

### Поля v2

| Поле               | Тип          | Обязательно | Смысл                             |
| ------------------ | ------------ | ----------- | --------------------------------- |
| `schedule_version` | `"v1"` \| `"v2"` | нет     | нет поля → **v1**; `"v2"` — график |
| `kind`             | `"debt"`     | да          | всегда долг, если остаток > 0     |
| `amount`           | decimal      | да          | сумма чека                        |
| `prepayment`       | decimal      | нет         | предоплата сейчас                 |
| `debt_days`        | int ≥ 1      | XOR         | число **платежей**                |
| `interval_days`    | int ≥ 1      | нет         | шаг в днях; default `1`           |
| `interval_months`  | int ≥ 1      | нет         | шаг в месяцах; default `1`        |
| `debt_months`      | int ≥ 1      | XOR         | число платежей в месячном графике |
| `first_due_date`   | `YYYY-MM-DD` | да          | дата 1-го платежа                 |
| `auto_schedule`    | bool         | да          | `true`                            |
| `installments`     | array        | нет         | приоритетнее автогенерации        |
| `sale_id`          | id продажи   | нет         | **не слать POS-корзину.** Сейчас касса не передаёт: `/main/pos/sales/{id}` ≠ Sale в deals, бэк отвечает `400 {"sale_id":["Указанная продажа не найдена."]}` |

Если `installments` пришли — сохранить как есть (копейки на последнем).  
Неизвестные поля — **не 400**.

### Формула дат v2

Остаток: `remaining = amount - prepayment` (центы).

```
base = floor(remaining_cents / count)
последний платёж = base + remainder
```

`100.00 / 3` → `33.33 + 33.33 + 33.34`.

- дни: `due_date[i] = first_due_date + i * interval_days`
- месяцы: `due_date[i] = first_due_date + i * interval_months` календарных месяцев; 31 янв + 1 мес = **28/29 фев**

### Checkout v2 (желательно, не блокер)

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

Фронт шлёт `debt_schedule` на checkout (extra, не блокер) и параллельно создаёт deal отдельным `POST` после checkout. Неизвестный extra — **не 400**.

---

## Ошибки v2

| Случай                         | HTTP       |
| ------------------------------ | ---------- |
| нет клиента на `kind=debt`     | 400        |
| и `debt_days`, и `debt_months` | 400        |
| `prepayment >= amount`         | 400        |
| `count < 1`                    | 400        |
| сумма `installments` ≠ остаток | 400        |
| неизвестное поле               | **не 400** |

v1 ошибки — как сейчас, не ужесточать.

---

## Критерии приёмки BE

**v1** (бэкенд default)

- [ ] Нет `debt_schedule_version` в настройках и нет `schedule_version` в `POST /deals/` → поведение как до этой задачи.
- [ ] `POST /deals/` с `schedule_version: "v1"` + `debt_days: 30` ведёт себя как до этой задачи.

**v2** (это приложение шлёт явно)

- [ ] `debt_months: 4` → **4** ежемесячных платежа, не 120 дневных.
- [ ] `debt_months: 3` + `interval_months: 2` → 3 платежа раз в 2 месяца.
- [ ] `debt_days: 10` + `interval_days: 2` → 10 платежей через день.
- [ ] Явные `installments[]` сохраняются как пришли.
- [ ] 31 янв + 1 месяц = конец февраля.
- [ ] Extra (`schedule_version`, `interval_months`, `debt_schedule` на checkout) не роняют 400.
- [ ] Неизвестный или POS `sale_id` — **не 400** (игнорировать), либо принимать UUID `/main/pos/sales/{id}`.

---

## Вне scope

- Редактирование отдельных дат/сумм в таблице на кассе (v2: полный превью + first due date + интервал).
- Проценты / пеня.
- График в чеке ESC/POS.
