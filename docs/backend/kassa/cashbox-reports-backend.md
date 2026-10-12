# Касса — отчёты на бэкенде (cashbox reports)

**Фронт:** `nur-market` (готов)  
**Бэкенд:** NurCRM API ✅ **готов**  
**Страницы:** `/crm/kassa/:id` → вкладка «Отчёты», `/crm/kassa/reports` → аналитика

Связанные документы: [auto-cashflows-backend.md](./auto-cashflows-backend.md), [README.md](./README.md).

---

## Содержание

1. [Проблема as-is](#проблема-as-is)
2. [Цель to-be](#цель-to-be)
3. [Эндпоинты](#эндпоинты)
4. [Отчёт по одной кассе](#1-отчёт-по-одной-кассе)
5. [Аналитика по периодам](#2-аналитика-по-периодам)
6. [Правила агрегации](#правила-агрегации)
7. [Права доступа](#права-доступа)
8. [Ошибки](#ошибки)
9. [Реализация на Django (рекомендации)](#реализация-на-django-рекомендации)
10. [Контракт фронта](#контракт-фронта)
11. [Тест-кейсы](#тест-кейсы)
12. [Выкат](#выкат)

---

## Проблема as-is

| Проблема | Последствие |
|----------|-------------|
| FE тянет все `GET /construction/cashflows/` постранично | До 20 000 записей на один отчёт |
| Агрегация на клиенте | Медленно, расход трафика, расхождения при лимите |
| Нет единого контракта | Дублирование логики в `useKassa`, `Reports.tsx`, branch export |

---

## Цель to-be

1. **Бэк** считает суммы и группировки в БД.
2. **Бэк** отдаёт готовый отчёт одним запросом.
3. **FE** только отображает ответ; fallback на старую схему только при `404/501` (до выката BE).

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <access_token>`.  
Часовой пояс границ дат: **Asia/Bishkek (UTC+6)**.

---

## Эндпоинты

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/construction/cashboxes/{cashbox_id}/report/` | Дневной / месячный отчёт одной кассы |
| `GET` | `/construction/cashbox-reports/analytics/` | Помесячная аналитика (1 или все кассы компании) |

---

## 1. Отчёт по одной кассе

### Request

`GET /construction/cashboxes/{cashbox_id}/report/`

| Query | Обяз. | Описание |
|-------|-------|----------|
| `period` | да | `day` \| `month` |
| `date` | если `period=day` | `YYYY-MM-DD` |
| `month` | если `period=month` | `YYYY-MM` |
| `status` | нет | `approved` (default) \| `pending` \| `all` |

Примеры:

```http
GET /api/construction/cashboxes/8b1c.../report/?period=day&date=2026-08-31
GET /api/construction/cashboxes/8b1c.../report/?period=month&month=2026-08
```

### Response 200 — месячный отчёт

```json
{
  "cashbox_id": "8b1c2d3e-....",
  "period": "month",
  "month": "2026-08",
  "date_from": "2026-08-01",
  "date_to": "2026-08-31",
  "status_filter": "approved",
  "summary": {
    "total_income": "125000.00",
    "total_expense": "45000.00",
    "net": "80000.00",
    "operations_count": 142
  },
  "days": [
    {
      "date": "2026-08-01",
      "summary": {
        "total_income": "5000.00",
        "total_expense": "1200.00",
        "net": "3800.00",
        "operations_count": 8
      },
      "flows": [
        {
          "id": "cf-1",
          "type": "income",
          "amount": "5000.00",
          "name": "Продажа #1042",
          "title": "Продажа #1042",
          "created_at": "2026-08-01T14:22:11+06:00",
          "status": "approved"
        }
      ]
    }
  ],
  "truncated": false,
  "complete": true
}
```

### Response 200 — дневной отчёт

```json
{
  "cashbox_id": "8b1c2d3e-....",
  "period": "day",
  "date": "2026-08-31",
  "date_from": "2026-08-31",
  "date_to": "2026-08-31",
  "status_filter": "approved",
  "summary": {
    "total_income": "12500.00",
    "total_expense": "3000.00",
    "net": "9500.00",
    "operations_count": 17
  },
  "flows": [
    {
      "id": "cf-99",
      "type": "expense",
      "amount": "3000.00",
      "name": "Закупка",
      "title": "Закупка",
      "created_at": "2026-08-31T11:05:00+06:00",
      "status": "approved"
    }
  ],
  "truncated": false,
  "complete": true
}
```

### Поля flow (минимум для UI)

| Поле | Тип | Комментарий |
|------|-----|-------------|
| `id` | string/int | PK cashflow |
| `type` | `income` \| `expense` | |
| `amount` | decimal string | всегда положительное число |
| `name` или `title` | string | подпись операции |
| `created_at` | ISO8601 | момент операции |
| `status` | string | `approved` / `pending` / … |

Допустим alias `daily_groups` вместо `days` (map `date → day`), но предпочтительно массив `days[]` — так проще сортировать.

---

## 2. Аналитика по периодам

Экран: `/crm/kassa/reports` (график + KPI по месяцам, фильтр кассы).

### Request

`GET /construction/cashbox-reports/analytics/`

| Query | Обяз. | Описание |
|-------|-------|----------|
| `date_from` | нет | `YYYY-MM-DD`, включительно |
| `date_to` | нет | `YYYY-MM-DD`, включительно |
| `cashbox` | нет | UUID кассы; если не передан — все доступные кассы компании |
| `group_by` | нет | только `month` (default) |
| `status` | нет | `approved` (default) |

Пример:

```http
GET /api/construction/cashbox-reports/analytics/?cashbox=8b1c...&date_from=2026-01-01&date_to=2026-08-31&group_by=month
```

### Response 200

```json
{
  "cashbox_id": "8b1c2d3e-....",
  "date_from": "2026-01-01",
  "date_to": "2026-08-31",
  "group_by": "month",
  "status_filter": "approved",
  "summary": {
    "total_income": "850000.00",
    "total_expense": "320000.00",
    "net": "530000.00",
    "operations_count": 980
  },
  "groups": [
    {
      "period": "2026-01",
      "label": "Янв 2026",
      "income": "90000.00",
      "expense": "40000.00",
      "net": "50000.00",
      "operations_count": 110
    },
    {
      "period": "2026-02",
      "label": "Фев 2026",
      "income": "95000.00",
      "expense": "42000.00",
      "net": "53000.00",
      "operations_count": 115
    }
  ],
  "truncated": false,
  "complete": true
}
```

`label` может генерироваться на бэке (`Янв 2026`) — FE принимает и свой fallback по `period`.

---

## Правила агрегации

1. **Границы дат** — по локали **Asia/Bishkek**:
   - `date_from T00:00:00+06:00` … `date_to T23:59:59.999+06:00`
2. **Суммы** — `Decimal`, в JSON строки с 2 знаками (`"1234.00"`).
3. **`amount`** в flow всегда **≥ 0**; тип определяет знак (`income` / `expense`).
4. **`net` = total_income − total_expense** (пересчитывать на бэке, не доверять FE).
5. **`operations_count`** — число cashflow после фильтров.
6. **Статус `approved`** — только записи со статусом `approved` / `"true"` (legacy).
7. **Сортировка:**
   - `days[]` — по `date` ASC
   - `flows[]` внутри дня — по `created_at` ASC
   - `groups[]` — по `period` ASC
8. **Пустой период** — `summary` с нулями, `days`/`flows`/`groups` = `[]`, HTTP 200.
9. **`truncated`** — `true`, если применён серверный лимит (например, >5000 flows в одном ответе). Тогда `complete=false`.

---

## Права доступа

| Роль | Доступ |
|------|--------|
| owner / admin компании | все кассы компании |
| employee | только кассы своего филиала/компании по текущим правилам cashflows |
| чужая компания | `404` или `403` |

Проверять, что `{cashbox_id}` принадлежит `request.user.company`.

---

## Ошибки

| HTTP | Когда |
|------|-------|
| `400` | нет `period`, неверный формат даты, `period=day` без `date`, `period=month` без `month` |
| `403` | нет прав на кассу |
| `404` | касса не найдена |
| `501` | (опционально до реализации; FE включит fallback) |

Пример 400:

```json
{
  "detail": "Query param 'month' is required when period=month."
}
```

---

## Реализация на Django (рекомендации)

### Модель

Использовать существующую таблицу cashflows (`construction.Cashflow` или аналог).

### Месячный отчёт — псевдокод

```python
from django.db.models import Sum, Count, Q, DecimalField
from django.db.models.functions import TruncDate

def build_monthly_report(cashbox, month: str, status: str):
    date_from, date_to = month_bounds_bishkek(month)
    qs = filter_flows(cashbox, date_from, date_to, status)

    summary = qs.aggregate(
        total_income=Sum("amount", filter=Q(type="income")),
        total_expense=Sum("amount", filter=Q(type="expense")),
        operations_count=Count("id"),
    )

    days = []
    for day in daterange(date_from, date_to):
        day_qs = qs.filter(created_at__date=day)
        days.append({
            "date": day.isoformat(),
            "summary": aggregate(day_qs),
            "flows": serialize_flows(day_qs.order_by("created_at")),
        })

    return {"period": "month", "month": month, "summary": summary, "days": days}
```

### Аналитика

```python
from django.db.models.functions import TruncMonth

qs = filter_flows(company_cashboxes, date_from, date_to, status)
groups = (
    qs.annotate(bucket=TruncMonth("created_at"))
      .values("bucket")
      .annotate(
          income=Sum("amount", filter=Q(type="income")),
          expense=Sum("amount", filter=Q(type="expense")),
          operations_count=Count("id"),
      )
      .order_by("bucket")
)
```

### URL routing (пример)

```python
path("construction/cashboxes/<uuid:cashbox_id>/report/", CashboxReportView.as_view()),
path("construction/cashbox-reports/analytics/", CashboxReportAnalyticsView.as_view()),
```

### Производительность

- Индекс: `(cashbox_id, created_at)`, `(cashbox_id, status, created_at)`.
- Для месячного отчёта: 1 aggregate + N day queries **или** один query + группировка в Python — приемлемо до ~10k flows/месяц.
- При >5000 flows в ответе — вернуть `truncated=true` и урезать `flows` (summary всё равно полный).

---

## Контракт фронта

Код FE:

| Файл | Роль |
|------|------|
| `src/entities/cash/lib/cashboxReportsApi.ts` | HTTP + fallback |
| `src/entities/cash/lib/cashboxReports.normalize.ts` | нормализация ответа BE |
| `src/features/kassa-worker/ui/hooks/useKassa.ts` | вкладка «Отчёты» |
| `src/features/kassa/ui/Reports/Reports.tsx` | аналитика `/crm/kassa/reports` |

### Поведение до выката BE

1. FE вызывает новый эндпоинт.
2. При `404` / `501` — fallback: старый `GET /construction/cashflows/` + клиентская агрегация.
3. При `truncated=true` — toast «Загружены не все операции…».

После выката BE fallback можно отключить env-флагом (опционально на будущее): `VITE_BE_CASHBOX_REPORTS=true`.

---

## Тест-кейсы

### Unit (BE)

| # | Сценарий | Ожидание |
|---|----------|----------|
| 1 | Месяц без операций | summary=0, days=[] |
| 2 | 3 income + 2 expense в один день | корректные day.summary и flows |
| 3 | `status=approved` | pending не попадает |
| 4 | Операция 23:59 +06:00 | попадает в нужный день |
| 5 | Операция 00:00 UTC (=06:00 Bishkek prev day edge) | проверить TZ |
| 6 | analytics без cashbox | сумма по всем кассам компании |
| 7 | analytics с cashbox | только одна касса |
| 8 | Чужая касса | 403/404 |

### QA (FE + staging)

| # | Шаг | Ожидание |
|---|-----|----------|
| 1 | `/crm/kassa/:id` → Отчёты → месяц | один запрос `.../report/?period=month` |
| 2 | Дневной отчёт | один запрос `.../report/?period=day` |
| 3 | `/crm/kassa/reports` | один запрос `.../cashbox-reports/analytics/` |
| 4 | DevTools: нет цикла `cashflows?page=` при работающем BE | |
| 5 | Сравнить totals BE vs старый FE fallback на staging | расхождение 0 |

---

## Выкат

1. **BE:** деплой эндпоинтов на staging.
2. **QA:** прогон чек-листа выше.
3. **FE:** уже готов; fallback обеспечивает совместимость.
4. **Prod:** BE + FE в один релиз (fallback можно оставить как safety net).

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-08-31 | Первая версия контракта; FE переведён на API с fallback |
