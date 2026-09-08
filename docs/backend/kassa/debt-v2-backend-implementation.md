# Backend: график долга v2 — implementation guide

**Репозиторий:** NurCRM API (Django) — отдельно от `nur-market`  
**Статус:** **не реализовано на stage** (2026-08-31) — см. раздел «Баг на stage»  
**Связано:** [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md), [cashier-settings.md](./cashier-settings.md)  
**Фронт (готов):** `src/pages/cashier/ui/hooks/usePaymentPage.ts`, `src/entities/sale/lib/buildDebtSchedule.ts`, `src/entities/sale/model/saleThunk.ts`

Префикс API: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)** · валюта: **сом**, decimal `"200.00"`.

---

## 1. Кратко

Маркет-касса шлёт **v2** — долг с графиком платежей (`installments[]`).  
Бэкенд на stage **принимает payload без 400**, но **пересчитывает сделку по v1**: один платёж через 30 дней, игнорируя `schedule_version`, `interval_days`, `first_due_date` и явный график.

**Задача BE:** при `schedule_version: "v2"` (или эквиваленте) сохранять и отдавать график **как прислал клиент** или по формулам ниже — **не** через legacy v1-логику `debt_days = дней до погашения`.

---

## 2. Баг на stage (2026-08-31)

### 2.1 Настройки кассы — v2 включён

```http
GET /api/main/pos/cashier-settings/
Authorization: Bearer <token>
```

```json
{
  "delete_item_code_required": false,
  "max_discount_percent": null,
  "debt_schedule_version": "v2",
  "deferred_schedule_version": "v2",
  "delete_item_code": null
}
```

### 2.2 Создание долга — фронт шлёт v2

```http
POST /api/main/clients/54548529-9c85-4b11-aab9-c4a25867258f/deals/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request** (полный пример — [docs/example.json](../../example.json)):

```json
{
  "title": "Долг Miizambekov Baiel",
  "kind": "debt",
  "amount": "200.00",
  "note": "",
  "client": "54548529-9c85-4b11-aab9-c4a25867258f",
  "debt_days": 7,
  "first_due_date": "2026-09-01",
  "interval_days": 2,
  "installments": [
    { "number": 1, "amount": "28.57", "due_date": "2026-09-01" },
    { "number": 2, "amount": "28.57", "due_date": "2026-09-03" },
    { "number": 3, "amount": "28.57", "due_date": "2026-09-05" },
    { "number": 4, "amount": "28.57", "due_date": "2026-09-07" },
    { "number": 5, "amount": "28.57", "due_date": "2026-09-09" },
    { "number": 6, "amount": "28.57", "due_date": "2026-09-11" },
    { "number": 7, "amount": "28.58", "due_date": "2026-09-13" }
  ],
  "schedule_version": "v2",
  "auto_schedule": true
}
```

**Смысл UI:** 7 платежей, интервал «через день» (`interval_days: 2`), первый платёж 01.09.2026, сумма 200 сом без предоплаты.

### 2.3 Фактический ответ — v1 fallback

```json
{
  "id": "991d6ff0-ea8c-4184-878b-b6bfd748ab41",
  "schedule_version": "v1",
  "debt_days": 30,
  "interval_days": 1,
  "interval_months": 1,
  "first_due_date": null,
  "amount": "200.00",
  "prepayment": "0.00",
  "debt_amount": "200.00",
  "daily_payment": "6.67",
  "remaining_debt": "200.00",
  "sale_id": "1c2f0c02-2128-4df7-93e2-2968647aff5c",
  "installments": [
    {
      "number": 1,
      "due_date": "2026-09-30",
      "amount": "200.00",
      "paid_amount": "0.00",
      "remaining_for_period": "200.00"
    }
  ]
}
```

### 2.4 Расхождение

| Поле | Request (v2) | Response (факт) | Ожидание v2 |
|------|--------------|-----------------|-------------|
| `schedule_version` | `"v2"` | `"v1"` | `"v2"` |
| `debt_days` | `7` (число **платежей**) | `30` (legacy default) | `7` |
| `interval_days` | `2` | `1` | `2` |
| `first_due_date` | `"2026-09-01"` | `null` | `"2026-09-01"` |
| `daily_payment` | ~`28.57` | `6.67` (= 200÷30) | `28.57` или `monthly_payment` |
| `installments.length` | 7 | 1 | 7 |
| 1-й взнос | 28.57 / 2026-09-01 | 200.00 / 2026-09-30 | как в request |

**Вывод:** serializer/model, похоже, уже знают поля v2, но **create-path** всё ещё вызывает legacy-генератор графика v1.

---

## 3. v1 vs v2 — семантика `debt_days`

| | **v1** | **v2** |
|---|--------|--------|
| `debt_days` | Календарных дней **до единственной даты погашения** | Число **платежей** в дневном графике |
| `debt_months` | — | Число **платежей** в месячном графике |
| `interval_days` / `interval_months` | не используются | шаг между платежами |
| `installments[]` | не шлём / игнор | **приоритет** — сохранить как пришли |
| `schedule_version` | `"v1"` или нет поля | `"v2"` |

**Критично:** одно поле `debt_days` означает **разное** в v1 и v2. Ветвление **только** по `schedule_version` (или нормализованному аналогу), не по наличию `installments` alone.

---

## 4. Когда считать сделку v2

```python
def normalize_schedule_version(raw) -> str:
    if raw in (None, "", "null"):
        return "v1"
    s = str(raw).strip().lower()
    if s in ("v2", "2"):
        return "v2"
    return "v1"
```

| Источник | Правило |
|----------|---------|
| `POST /deals/` body `schedule_version` | главный сигнал |
| Нет `schedule_version` в body | **v1** (backward compatible) |
| `GET cashier-settings` `debt_schedule_version` | **не подменяет** body; влияет только на UI кассы |

`deferred_schedule_version` — алиас для настроек кассы; в deals использовать только `schedule_version`.

---

## 5. Алгоритм `POST /main/clients/{client_id}/deals/`

### 5.1 Общие проверки (v1 и v2)

```python
if payload.kind == "debt" and not client_id:
    raise ValidationError("Клиент обязателен для долга")

prepayment = Decimal(payload.prepayment or "0")
amount = Decimal(payload.amount)
if prepayment >= amount:
    raise ValidationError("prepayment must be less than amount")
```

### 5.2 Ветка v1 — **не менять**

Текущее поведение для `schedule_version != "v2"`:

- `debt_days` = дней до погашения;
- один или legacy-график как сейчас;
- `daily_payment = amount / debt_days` (или как реализовано).

### 5.3 Ветка v2

```python
def create_debt_v2(payload) -> Deal:
    version = normalize_schedule_version(payload.get("schedule_version"))
    assert version == "v2"

    amount = money(payload.amount)
    prepayment = money(payload.prepayment or "0")
    remaining = amount - prepayment

    has_days = payload.debt_days is not None
    has_months = payload.debt_months is not None
    if has_days and has_months:
        raise ValidationError("Укажите debt_days или debt_months, не оба")

    first_due = payload.first_due_date  # обязательно YYYY-MM-DD
    if not first_due:
        raise ValidationError("first_due_date обязателен для v2")

    deal = Deal(
        kind="debt",
        amount=amount,
        prepayment=prepayment,
        schedule_version="v2",
        first_due_date=first_due,
        auto_schedule=bool(payload.auto_schedule),
        remaining_debt=remaining,
        debt_amount=remaining,
        # ...
    )

    if has_days:
        deal.debt_days = int(payload.debt_days)          # число ПЛАТЕЖЕЙ
        deal.interval_days = int(payload.interval_days or 1)
        deal.debt_months = None
        deal.interval_months = 1  # default модели, не используется
    else:
        deal.debt_months = int(payload.debt_months)
        deal.interval_months = int(payload.interval_months or 1)
        deal.debt_days = None
        deal.interval_days = 1

    # --- график ---
    if payload.installments:
        installments = validate_and_normalize_installments(
            payload.installments,
            expected_count=(deal.debt_days or deal.debt_months),
            expected_sum=remaining,
        )
    else:
        installments = generate_installments_v2(deal, remaining)

    deal.installments.set(installments)
    deal.daily_payment = installments[0].amount  # или monthly_payment для месяцев
    deal.save()
    return deal
```

### 5.4 Приоритет явного `installments[]`

Если массив **непустой**:

1. Сохранить **как пришёл** (даты, суммы, `number`).
2. Проверить: `sum(amounts) == remaining` (в центах).
3. Проверить: `len(installments) == debt_days` или `debt_months` (если count передан).
4. **Не** перегенерировать через v1.

Копейки: допустим последний взнос больше на remainder (`200.00 / 7` → `28.57×6 + 28.58`).

### 5.5 Автогенерация, если `installments` пуст

```python
def generate_installments_v2(deal, remaining: Decimal) -> list[Installment]:
    if deal.debt_days:
        count = deal.debt_days
        step_days = deal.interval_days or 1
        amounts = split_money_evenly(remaining, count)
        return [
            Installment(
                number=i + 1,
                amount=amounts[i],
                due_date=add_days(deal.first_due_date, i * step_days),
            )
            for i in range(count)
        ]

    count = deal.debt_months
    step_months = deal.interval_months or 1
    amounts = split_money_evenly(remaining, count)
    return [
        Installment(
            number=i + 1,
            amount=amounts[i],
            due_date=add_calendar_months(deal.first_due_date, i * step_months),
        )
        for i in range(count)
    ]


def split_money_evenly(total: Decimal, count: int) -> list[Decimal]:
    """Остаток копеек — в последний платёж."""
    cents = int(total * 100)
    base, rem = divmod(cents, count)
    out = [Decimal(base) / 100] * count
    out[-1] += Decimal(rem) / 100
    return out
```

**Месяцы:** `add_calendar_months("2026-01-31", 1) → 2026-02-28` (не ×30 дней).

### 5.6 `sale_id` / привязка POS-продажи

- Касса **не шлёт** `sale_id` в `POST /deals/` (POS UUID ≠ Sale в deals → был 400).
- Если бэкенд **сам** линкует sale после checkout — ок, на график v2 **не влияет**.
- Не вызывать v1-пересчёт графика из-за наличия `sale_id`.

---

## 6. Ожидаемый ответ для примера stage

Для request из раздела 2.2 ответ **201** должен содержать:

```json
{
  "id": "<uuid>",
  "kind": "debt",
  "schedule_version": "v2",
  "amount": "200.00",
  "prepayment": "0.00",
  "debt_days": 7,
  "debt_months": null,
  "interval_days": 2,
  "interval_months": 1,
  "first_due_date": "2026-09-01",
  "debt_amount": "200.00",
  "remaining_debt": "200.00",
  "daily_payment": "28.57",
  "installments": [
    { "number": 1, "due_date": "2026-09-01", "amount": "28.57", "paid_amount": "0.00" },
    { "number": 2, "due_date": "2026-09-03", "amount": "28.57", "paid_amount": "0.00" },
    { "number": 3, "due_date": "2026-09-05", "amount": "28.57", "paid_amount": "0.00" },
    { "number": 4, "due_date": "2026-09-07", "amount": "28.57", "paid_amount": "0.00" },
    { "number": 5, "due_date": "2026-09-09", "amount": "28.57", "paid_amount": "0.00" },
    { "number": 6, "due_date": "2026-09-11", "amount": "28.57", "paid_amount": "0.00" },
    { "number": 7, "due_date": "2026-09-13", "amount": "28.58", "paid_amount": "0.00" }
  ]
}
```

---

## 7. Остальные эндпоинты

### 7.1 `GET /main/clients/{id}/deals/{deal_id}/`

- Отдавать сохранённые `schedule_version`, `interval_*`, `first_due_date`, полный `installments[]`.
- `remaining_debt` = сумма неоплаченных взносов (или `amount - prepayment - sum(paid)`).

### 7.2 `PATCH /main/clients/{id}/deals/{deal_id}/`

| Были оплаты | Можно менять |
|-------------|--------------|
| Да | `title`, `note` |
| Нет | + `amount`, `debt_days`/`debt_months`, `first_due_date`, `installments[]`, `auto_schedule: true` |

Для v2-sделок PATCH **не должен** конвертировать в v1.

### 7.3 `POST .../deals/{deal_id}/pay/`

Без изменений контракта; оплата по `installment_id`:

```json
{
  "idempotency_key": "<uuid>",
  "installment_id": "<installment uuid>",
  "date": "2026-09-01",
  "amount": "28.57"
}
```

После оплаты: обновить `paid_amount`, `paid_on`, `remaining_debt`, `remaining_for_period`.

### 7.4 `POST /main/pos/sales/{id}/checkout/`

Extra (не блокер, не 400):

```json
{
  "payment_method": "debt",
  "client_id": "<uuid>",
  "cash_received": "0.00",
  "schedule_version": "v2",
  "debt_schedule": {
    "unit": "day",
    "count": 7,
    "interval_days": 2,
    "first_due_date": "2026-09-01",
    "installments": []
  }
}
```

Checkout **не заменяет** `POST /deals/` — касса создаёт deal **отдельным** запросом после checkout.

---

## 8. Ошибки HTTP

| Случай | HTTP |
|--------|------|
| `kind=debt` без клиента | 400 |
| `debt_days` и `debt_months` одновременно | 400 |
| `prepayment >= amount` | 400 |
| v2 без `first_due_date` | 400 |
| `count < 1` | 400 |
| сумма `installments` ≠ `amount - prepayment` | 400 |
| неизвестное extra-поле | **не 400** |
| v2 payload на старом коде | **не 400** — либо v2, либо явная 501 до реализации |

---

## 9. Тест-кейсы (pytest)

### 9.1 Регрессия stage (P0)

```python
def test_debt_v2_explicit_installments_stage_case(api, client, auth):
    payload = load_json("docs/example.json")  # 7 payments, interval 2
    r = api.post(f"/main/clients/{client.id}/deals/", payload, **auth)
    assert r.status_code == 201
    data = r.json()
    assert data["schedule_version"] == "v2"
    assert data["debt_days"] == 7
    assert data["interval_days"] == 2
    assert data["first_due_date"] == "2026-09-01"
    assert len(data["installments"]) == 7
    assert data["installments"][0]["amount"] == "28.57"
    assert data["installments"][-1]["amount"] == "28.58"
    assert sum_decimal(i["amount"] for i in data["installments"]) == Decimal("200.00")
```

### 9.2 v2 автогенерация по дням

```python
def test_debt_v2_auto_daily(api, client, auth):
    r = api.post(f"/main/clients/{client.id}/deals/", {
        "kind": "debt",
        "amount": "100.00",
        "debt_days": 3,
        "interval_days": 1,
        "first_due_date": "2026-09-01",
        "schedule_version": "v2",
        "auto_schedule": True,
    }, **auth)
    assert r.status_code == 201
    inst = r.json()["installments"]
    assert len(inst) == 3
    assert [i["due_date"] for i in inst] == ["2026-09-01", "2026-09-02", "2026-09-03"]
    assert [i["amount"] for i in inst] == ["33.33", "33.33", "33.34"]
```

### 9.3 v2 месяцы — не ×30

```python
def test_debt_v2_months_not_converted_to_days(api, client, auth):
    r = api.post(..., {
        "amount": "400.00",
        "debt_months": 4,
        "interval_months": 1,
        "first_due_date": "2026-01-31",
        "schedule_version": "v2",
        "auto_schedule": True,
    })
    dates = [i["due_date"] for i in r.json()["installments"]]
    assert dates[1] == "2026-02-28"  # или 29 в високосный
    assert r.json()["debt_days"] is None
```

### 9.4 v1 не сломан

```python
def test_debt_v1_unchanged(api, client, auth):
    r = api.post(..., {
        "kind": "debt",
        "amount": "200.00",
        "debt_days": 30,
        "first_due_date": "2026-09-30",
        "schedule_version": "v1",
        "auto_schedule": True,
    })
    assert r.status_code == 201
    assert r.json()["schedule_version"] == "v1"
    assert len(r.json()["installments"]) == 1  # legacy
```

### 9.5 default без schedule_version = v1

```python
def test_debt_default_is_v1(api, client, auth):
    r = api.post(..., {"kind": "debt", "amount": "100.00", "debt_days": 30, "auto_schedule": True})
    assert r.json()["schedule_version"] == "v1"
```

---

## 10. Чек-лист приёмки

**P0 — блокирует маркет v2 на prod**

- [ ] `POST /deals/` + `schedule_version: "v2"` + `installments[]` → график **как в request** (кейс example.json).
- [ ] `debt_days` в v2 = число платежей, **не** 30 по умолчанию.
- [ ] `first_due_date` сохраняется и отдаётся в GET.
- [ ] `interval_days` / `interval_months` сохраняются.
- [ ] v1-сделки без изменений.

**P1**

- [ ] Автогенерация v2 без `installments[]`.
- [ ] Месячный график без конвертации в дни.
- [ ] PATCH v2 до первых оплат пересчитывает график.
- [ ] Pay/refund по `installment_id` для multi-installment v2.

**P2**

- [ ] Extra `debt_schedule` на checkout сохраняется/логируется (optional).
- [ ] KPI клиента: `remaining_debt` по v2 = сумма неоплаченных взносов.

---

## 11. Поток с кассы (контекст для BE)

```text
1. GET  /main/pos/cashier-settings/     → debt_schedule_version: "v2"
2. POST /main/pos/sales/{id}/checkout/  → payment_method: "debt", client_id, cash_received (предоплата)
3. POST /main/clients/{id}/deals/       → schedule_version: "v2", installments[], ...
4. (optional) POST /main/cashflows/     → предоплата, если была
```

Шаг 3 **обязателен** для CRM-графика. Шаг 2 закрывает POS-чек.

---

## 12. Ссылки

| Документ | Содержание |
|----------|------------|
| [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md) | Контракт v1/v2, поля, ошибки |
| [cashier-settings.md](./cashier-settings.md) | `debt_schedule_version` в настройках |
| [../../example.json](../../example.json) | Payload воспроизведения бага |
| [../../flutter/debt-installment-schedule.md](../../flutter/debt-installment-schedule.md) | Поведение фронта / Flutter |
| [../../flutter/client-debt-and-kpis.md](../../flutter/client-debt-and-kpis.md) | Карточка клиента, оплата взносов |
