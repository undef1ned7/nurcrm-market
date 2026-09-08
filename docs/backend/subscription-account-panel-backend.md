# Подписка и аккаунт компании — панель «Подробная информация»: ТЗ для бэкенда

**Фронт:** новая вкладка в Настройках («Тариф и оплата») + компактная карточка в Аналитике.
**Статус:** фронта пока нет; часть данных уже приходит в `GET /users/company/`, часть нужно добавить.
**Основной потребитель:** владелец компании (`role = owner`). Для остальных сотрудников — урезанный набор (см. §7 «Доступ»).

Экран показывает:

1. **Аккаунт открыт** — дата регистрации компании.
2. **Срок ежемесячной оплаты** — до какой даты оплачено и «осталось N дней».
3. **Тариф** — «Старт» / «Стандарт» (+ цена, период, лимиты).
4. **Мелочи** — статус подписки, автопродление, последний платёж, использование лимитов (сотрудники N из M и т.п.), история платежей.

---

## 1. Что уже есть в `GET /users/company/`

| Поле | Тип | Комментарий |
|---|---|---|
| `id` / `uuid` | id | |
| `name`, `slug`, `sector` | | |
| `subscription_plan` | object | сейчас фронт читает только `subscription_plan.name` (`"Старт"` / `"Стандарт"`) |
| `end_date` | date (`YYYY-MM-DD`) | до какой даты действует компания. Фронт по нему считает «осталось дней» и рисует тарифный алерт (7/3/1) |

⚠️ **Расхождение именования:** в `docs/backend/kassa/notifications-backend-implementation.md` то же самое названо `company.subscription_end_date`. Нужно одно каноническое имя + алиас на переходный период. Предлагаем каноническое **`end_date`** (его уже читает весь фронт) или, если делаем вложенный объект — `subscription.end_date` с зеркалом в `company.end_date`.

---

## 2. Чего не хватает — добавить

| # | Поле | Тип | Обяз. | Назначение |
|---|---|---|---|---|
| 1 | `created_at` | datetime ISO 8601 (`+06:00`) | да | «Аккаунт открыт в …». Дата создания компании. Сейчас в ответе её нет. |
| 2 | `subscription.started_at` | date | желательно | Начало текущего оплаченного периода (для «оплачено с … по …»). |
| 3 | `subscription.days_left` | int (может быть 0 и отрицательным) | да | «Осталось N дней». **Считает сервер** (см. §5), чтобы фронт и бэкенд-уведомления совпадали. |
| 4 | `subscription.status` | enum: `active` \| `expiring_soon` \| `expired` \| `trial` \| `grace` \| `unknown` | да | Состояние. `expiring_soon` — при `days_left <= 7`. `unknown` — если `end_date` не задан. |
| 5 | `subscription.plan` | object (см. §3) | да | Полные данные тарифа, а не только `name`. |
| 6 | `subscription.auto_renew` | bool \| null | нет | Включено ли автопродление (если такого механизма нет — `null`, фронт скроет). |
| 7 | `subscription.is_trial` | bool | нет | Пробный период. |
| 8 | `subscription.next_payment_at` | date \| null | нет | Дата следующего списания/оплаты (обычно = `end_date`). |
| 9 | `subscription.last_payment` | object \| null (см. §4) | нет | Последний платёж — сумма, дата, метод. |
| 10 | `limits` | object (см. §6) | желательно | Лимиты тарифа и текущее потребление (сотрудники, склады, товары). |

---

## 3. `subscription.plan` — объект тарифа

Берётся из `/users/subscription-plans/` (уже существует), но должен быть **вложен прямо в ответ компании**, чтобы не делать второй запрос и не сопоставлять по имени.

```json
{
  "id": 2,
  "code": "standard",              // стабильный машинный код: "start" | "standard"
  "name": "Стандарт",              // человекочитаемое, как сейчас
  "price": "1990.00",              // цена за период
  "currency": "KGS",
  "period": "month",               // "month" | "year"
  "description": "Полный доступ ко всем модулям"
}
```

- `code` — **новое обязательное** поле. Фронт сейчас различает тарифы строковым сравнением с `"Старт"` (76 мест в коде) — это хрупко. Дайте `code` (`start` / `standard`), имя оставьте для показа.

---

## 4. `subscription.last_payment` — последний платёж

```json
{
  "amount": "1990.00",
  "currency": "KGS",
  "paid_at": "2026-08-15T10:30:00+06:00",
  "method": "manual",              // "manual" | "card" | "bank" | ... — как учитываете
  "period_start": "2026-08-15",
  "period_end": "2026-09-15"
}
```

Если платежи нигде не фиксируются — верните `null`, поле опциональное.

---

## 5. Расчёт `days_left` — на сервере

Чтобы карточка в аккаунте и пуш-уведомления (7/3/1 дня) никогда не расходились:

- Часовой пояс компании — **Asia/Bishkek (UTC+6)**. Сравнение по **календарным датам**, без времени.
- `days_left = (end_date - today_local).days`, где `today_local` — сегодня в TZ компании.
- `end_date` — **включительно** (в этот день ещё оплачено): если `end_date == today`, то `days_left = 0`, `status = active` (или `expiring_soon`).
- `end_date < today` → `days_left` отрицательный, `status = expired`.
- `end_date` пустой → `days_left = null`, `status = unknown`.
- Опционально: `grace` — N дней после `end_date`, когда доступ ещё не отрезан.

Фронт всё равно продублирует расчёт из `end_date` как fallback, но ведущим считает серверный `days_left`.

---

## 6. `limits` — лимиты и потребление (желательно)

```json
{
  "employees":  { "used": 3, "max": 3 },
  "warehouses": { "used": 1, "max": null },   // null = без ограничения
  "products":   { "used": 812, "max": null }
}
```

Для тарифа «Старт» в секторе «Магазин» уже зашит лимит **3 сотрудника** (`MARKET_START_EMPLOYEE_LIMIT`). Хорошо бы отдавать его данными, а не хардкодить на фронте.

---

## 7. Доступ (security)

По аналогии с утечкой `cashier_password` (`docs/backend/kassa/cashier-settings.md`): **финансовая часть — только владельцу**.

| Поле | owner | прочие сотрудники |
|---|---|---|
| `created_at`, `plan.name`, `plan.code`, `end_date`, `days_left`, `status` | ✅ | ✅ |
| `plan.price`, `currency`, `last_payment`, `next_payment_at`, `auto_renew`, история платежей | ✅ | ❌ (не отдавать в ответе вообще) |
| `limits` | ✅ | ✅ (можно) |

---

## 8. Варианты API

### Вариант A — расширить `GET /users/company/` (минимум для карточки)

Добавить в текущий ответ:

```json
{
  "id": "…",
  "name": "…",
  "created_at": "2025-11-20T09:00:00+06:00",
  "end_date": "2026-09-15",
  "subscription": {
    "status": "active",
    "started_at": "2026-08-15",
    "end_date": "2026-09-15",
    "days_left": 11,
    "is_trial": false,
    "auto_renew": null,
    "next_payment_at": "2026-09-15",
    "plan": {
      "id": 2, "code": "standard", "name": "Стандарт",
      "price": "1990.00", "currency": "KGS", "period": "month",
      "description": "Полный доступ ко всем модулям"
    },
    "last_payment": {
      "amount": "1990.00", "currency": "KGS",
      "paid_at": "2026-08-15T10:30:00+06:00", "method": "manual",
      "period_start": "2026-08-15", "period_end": "2026-09-15"
    }
  },
  "limits": {
    "employees": { "used": 3, "max": 3 },
    "warehouses": { "used": 1, "max": null },
    "products": { "used": 812, "max": null }
  }
}
```

`subscription_plan` (плоское, как сейчас) оставить как алиас `subscription.plan` на переходный период.

### Вариант B — отдельный эндпоинт для полной панели + история

```
GET /users/company/subscription/          (owner-only)
```

```json
{
  "company_created_at": "2025-11-20T09:00:00+06:00",
  "status": "active",
  "days_left": 11,
  "started_at": "2026-08-15",
  "end_date": "2026-09-15",
  "next_payment_at": "2026-09-15",
  "auto_renew": null,
  "is_trial": false,
  "plan": { "id": 2, "code": "standard", "name": "Стандарт", "price": "1990.00", "currency": "KGS", "period": "month" },
  "limits": { "employees": { "used": 3, "max": 3 } },
  "payments": [
    { "amount": "1990.00", "currency": "KGS", "paid_at": "2026-08-15T10:30:00+06:00", "method": "manual", "period_start": "2026-08-15", "period_end": "2026-09-15" },
    { "amount": "1990.00", "currency": "KGS", "paid_at": "2026-07-15T11:00:00+06:00", "method": "manual", "period_start": "2026-07-15", "period_end": "2026-08-15" }
  ]
}
```

`payments` — пагинация DRF (`?page=`), сортировка `-paid_at`. Если истории нет — `payments: []`.

**Рекомендация:** сделать **и то, и другое** — Вариант A закрывает карточку/бейджи без лишних запросов, Вариант B нужен для полной панели с историей и не тащит платежи в общий ответ компании.

---

## 9. Edge-кейсы

| Ситуация | Ожидаемое поведение |
|---|---|
| `end_date` не задан | `days_left: null`, `status: "unknown"`, фронт покажет «срок не установлен» |
| `end_date` сегодня | `days_left: 0`, доступ есть, `status: "expiring_soon"` |
| `end_date` в прошлом | `days_left` < 0, `status: "expired"` |
| Пробный период | `is_trial: true`, `status: "trial"`, `plan` — на каком тарифе триал |
| Смена тарифа в середине периода | `plan` = актуальный; при наличии — `plan_changes: [{ from, to, effective_at }]` (опционально) |
| Компания без `subscription_plan` | `plan: null`, фронт покажет «тариф не назначен» |
| `created_at` отсутствует у старых компаний | вернуть `null`; фронт покажет «—» |

---

## 10. Приёмка

- [ ] `GET /users/company/` отдаёт `created_at` (ISO 8601, TZ компании).
- [ ] `subscription.days_left` считается сервером по TZ Asia/Bishkek, календарными днями, `end_date` включительно.
- [ ] `subscription.status` покрывает все значения enum из §2.
- [ ] `subscription.plan.code` (`start` / `standard`) присутствует — не только `name`.
- [ ] `plan.price` / `last_payment` / `payments` **не отдаются** не-владельцам.
- [ ] Каноническое имя даты окончания зафиксировано (`end_date`), алиас `subscription_end_date` синхронен.
- [ ] (если делаем) `GET /users/company/subscription/` — owner-only, `payments` с пагинацией `-paid_at`.
- [ ] `limits.employees.max` для «Старт» приходит данными (3), фронт перестаёт хардкодить.
- [ ] Для компаний без `end_date` / без плана / без `created_at` — корректные `null`, без 500.
