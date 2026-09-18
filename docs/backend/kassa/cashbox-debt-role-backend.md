# Роль кассы «Для долгов» (`role: "debt"`)

**Страницы:** `/crm/kassa` (список касс, `CafeKassa` → `CashboxList`)
**Статус:** фронт готов за флагом `VITE_CASHBOX_DEBT_ROLE` (по умолчанию выкл) · **бэкенд — ТЗ к реализации**
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Связанные эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `POST` | `/construction/cashboxes/` | создание кассы — **расширяется** явным `role` |
| `PATCH` | `/construction/cashboxes/{id}/` | смена роли существующей кассы — **расширяется** полем `role` |
| — | `resolve_cashbox()` | маршрутизация `debt_repayment` / `supplier_debt_payment` — **новый приоритет** |

Читать вместе с: [auto-cashflows-backend.md](./auto-cashflows-backend.md) (`resolve_cashbox`, роли касс),
[pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md) (реальный пример — касса «карыз»
с ролью `pos_main` по ошибке), [cashbox-delete-backend.md](./cashbox-delete-backend.md) (удаление/слияние касс),
[shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md) (`drawer_expected_cash` —
критично для §5 этого документа).

---

## 1. Задача клиента

> «Сейчас есть касса "Карыз" (с кыргызского на русский — долг). Эта касса создана для долгов.
> Давайте создадим функцию: когда создаётся касса для долгов, появится галочка "Для долгов",
> и долги будут попадать именно в эту кассу».

Реальный пример с прода (см. [pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md)):
касса с названием «карыз» (кырг. «долг») **не содержит** ни одного ключевого слова из текущей
эвристики маршрутизации (`филиал`/`основн`/`переменн`/`постоянн`) и поэтому по умолчанию получила
роль `pos_main` — деньги по ней путаются с основной кассой продаж. Владелец создавал её осознанно
для учёта долгов, но система об этом не знала.

**Цель:** явная роль `debt` на кассе + чекбокс «Для долгов» в UI создания — и авто-операции по
долгам (погашение долга клиентом, оплата долга поставщику) идут именно в неё, а не в POS-кассу
или «Переменные расходы» по умолчанию.

---

## 2. Новая роль в модели данных

Дополнить `Cashbox.role` (см. [auto-cashflows-backend.md](./auto-cashflows-backend.md) §«Модель данных»):

```python
class CashboxRole(models.TextChoices):
    POS_MAIN = "pos_main"
    POS_BRANCH = "pos_branch"
    EXPENSE_VARIABLE = "expense_variable"
    EXPENSE_FIXED = "expense_fixed"
    DEBT = "debt"          # NEW
```

**Уникальность (та же рекомендация, что для `pos_main`/`expense_variable`):**
`(company_id, role="debt")`, `branch_id IS NULL` — не более одной активной кассы роли `debt`
на компанию. Кассы-для-долгов **на филиал** не нужны (в отличие от `pos_branch`) — долги,
даже полученные в кассе филиала, идут в одну общую кассу долгов компании.

---

## 3. Маршрутизация: что меняется в `resolve_cashbox`

**Тела запросов checkout / pay НЕ меняются.** Вся логика — новый приоритетный шаг внутри
`resolve_cashbox()` для двух существующих `source_kind`:

### 3.1. `debt_repayment` (клиент платит нам)

Сейчас (`auto-cashflows-backend.md` §«Алгоритм», шаг 3): `shift.cashbox → pos_branch → pos_main`.

**Новый порядок:**

```
Если company имеет активную кассу role="debt":
    cashbox = эта касса
    shift = резолвится как раньше (shift_id из контекста → open shift кассира) — см. §5!
Иначе:
    прежнее поведение: shift.cashbox → pos_branch(branch_id) → pos_main
```

### 3.2. `supplier_debt_payment` (мы платим поставщику)

Сейчас: всегда `expense_variable`, `shift=null`, `affects_shift_drawer=false`.

**Новый порядок:**

```
Если company имеет активную кассу role="debt":
    cashbox = эта касса
Иначе:
    прежнее поведение: expense_variable
shift = null, affects_shift_drawer = false   (без изменений — не POS-операция)
```

### 3.3. Что НЕ входит в область действия (явно)

- `pos_prepayment` (предоплата при checkout в долг) — **остаётся** в POS-маршруте
  (shift → pos_branch → pos_main). Это часть чека, а не отдельная операция погашения долга.
- Legacy `PATCH /main/debts/{id}/` — **включить** в то же правило §3.1 (это тот же
  `debt_repayment` по сути, единый движок согласно `BACKEND-QUESTIONS.md` п.16).
- Создание самого долга (продажа в долг без предоплаты, `cashflows: []`) — деньги не двигаются,
  роль `debt` не участвует.

### 3.4. Матрица (дополнение к таблице в auto-cashflows-backend.md)

| Операция | `source_kind` | `type` | Касса (есть `role=debt`) | Касса (нет `role=debt`) |
|---|---|---|---|---|
| Погашение долга клиента | `debt_repayment` | income | **`debt`** | смена → pos_branch → pos_main |
| Legacy `/main/debts/{id}/` | `debt_repayment` | income | **`debt`** | pos_main / смена |
| Погашение долга поставщику | `supplier_debt_payment` | expense | **`debt`** | expense_variable |

---

## 4. Явный `role` при создании / изменении кассы

Сейчас `POST /construction/cashboxes/` принимает только `{ name, is_consumption }`, и роль
присваивается по ключевым словам в названии (см. [pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md) —
это и есть корень бага с «карыз»). Нужно:

### 4.1. `POST /construction/cashboxes/`

```json
{ "name": "Карыз", "is_consumption": false, "role": "debt" }
```

- Если `role` передан явно и валиден (`pos_main`, `pos_branch`, `expense_variable`,
  `expense_fixed`, `debt`) — использовать его, **не** применяя keyword-fallback.
- `role="debt"` + у компании уже есть активная `debt`-касса → **не блокировать** (мы это
  предупреждаем на фронте, см. §7), но рекомендуется мягкое предупреждение в ответе
  (`warnings: ["duplicate_debt_role"]`) — опционально.
- `role="pos_branch"` без `branch_id` → `400`.
- Без `role` — прежнее поведение (keyword-fallback), обратная совместимость.

### 4.2. `PATCH /construction/cashboxes/{id}/`

```json
{ "role": "debt" }
```

**Это позволяет исправить уже существующую кассу** (например, ту самую «карыз» с ошибочным
`pos_main`) без миграции данных силами бэка — через обычный UI.

Проверки:
- Права: `owner`/`admin`.
- Если у кассы была роль, от которой зависят авто-операции (`pos_main`/`pos_branch` —
  последняя своей на branch/компанию, `expense_variable` — последняя), и меняем на `debt` —
  применить **ту же защиту**, что и при удалении такой кассы: `409 cashbox_role_required`,
  если это последняя активная касса критичной роли (переиспользовать проверку из
  [cashbox-delete-backend.md](./cashbox-delete-backend.md) §3.1.5 — смена роли эквивалентна
  «потере» кассы для старой роли).
- Смена роли **не** трогает существующие `CashFlow` — только меняет, куда пойдут **новые**
  операции.

---

## 5. Критично: `drawer_expected_cash` не должен «потерять» наличные

**Это самый важный пункт документа.** Наличная оплата долга клиентом физически попадает
в ящик кассира (тот же физический денежный ящик, что и обычные продажи), даже если теперь
запись идёт в кассу «Долги», а не в POS-кассу смены.

Если после введения роли `debt` `drawer_expected_cash` смены перестанет учитывать эти
наличные — воспроизведётся **тот же класс бага**, что был исправлен в
[shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md) (там —
недостача из-за чужих расходов на POS-кассе; здесь — обратная ситуация: реальный излишек
в ящике, не учтённый в `expected_cash`, потому что приход «уехал» в другую кассу).

### 5.1. Требование

`debt_repayment` cashflow, оплаченный **наличными**, должен:
- иметь `cashbox = касса «Долги»` (для отчёта/ленты кассы долгов);
- **и одновременно** учитываться в `drawer_expected_cash` той открытой смены, в рамках
  которой оплата произошла (`shift_id` резолвится как раньше — открытая смена кассира/из
  контекста).

Технически это значит: расчёт `drawer_expected_cash` (см.
[shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md) §«Формула») должен
суммировать наличные `debt_repayment` **по `shift_id`, независимо от `cashbox_id`** — то есть
критерий включения в ящик смены — это `shift_id = self` (и `payment_method=cash`/аналог), а
**не** `cashbox_id = shift.cashbox_id`, как было неявно устроено раньше (когда `debt_repayment`
и `pos_sale` всегда шли в одну кассу).

### 5.2. Вопрос к бэкенду (см. также §8 Q2)

Нужно подтвердить: как именно сейчас `debt_repayment` наличными учитывается в
`drawer_expected_cash` (через `cash_sales_total`, через отдельный `income_total` смены, или
никак) — от этого зависит, что именно нужно поменять, чтобы после введения роли `debt`
поведение не сломалось. Без ответа на этот вопрос фичу **не включать в прод**.

---

## 6. Ответы API

### 6.1. `GET /construction/cashboxes/` — новая касса в списке

```json
{
  "id": "debt-cb-uuid",
  "name": "Карыз",
  "role": "debt",
  "is_consumption": false,
  "branch_id": null,
  "is_active": true,
  "balance": "-2000.00",
  "analytics": { "income_total": "5000.00", "expense_total": "7000.00", "operations_count": 12 }
}
```

### 6.2. Пример `CashFlow` по погашению долга клиента наличными

```json
{
  "id": "cf-uuid",
  "type": "income",
  "amount": "500.00",
  "cashbox": "debt-cb-uuid",
  "cashbox_name": "Карыз",
  "shift_id": "shift-uuid",
  "source_kind": "debt_repayment",
  "status": "approved"
}
```

`shift_id` заполнен, несмотря на то что `cashbox` — не `shift.cashbox` (см. §5).

---

## 7. Контракт фронта

| Файл | Роль |
|---|---|
| `src/entities/cash/lib/cashboxMutations.ts` | `CASHBOX_ROLE.DEBT`, `isCashboxDebtRoleEnabled`, `isDebtCashbox`, `hasActiveDebtCashbox`, `cashboxRoleLabel`, `buildCreateCashboxPayload(name, "debt")` |
| `src/entities/cash/model/cashSlice.ts` | thunk `updateCashboxRole({id, role})` → `PATCH /construction/cashboxes/{id}/` |
| `src/features/kassa/ui/Kassa.tsx` | чекбокс «Для долгов» в модалке создания (взаимоисключающий с «Прочие расходы»); кнопка «Для долгов» на кассе в списке (назначить существующей); предупреждение при попытке создать вторую `debt`-кассу |
| `.env.example` | `VITE_CASHBOX_DEBT_ROLE` |

### Поведение до выката BE

- Флаг `VITE_CASHBOX_DEBT_ROLE` выключен → чекбокса и кнопки нет; создание кассы работает
  как раньше (`{name, is_consumption}`, без `role`).
- Никаких изменений в `pay`/`checkout`/`/main/debts/` payload — фронт их не трогает, вся
  фича — на стороне `resolve_cashbox` и создания/правки кассы.

### Порядок выката

1. BE: `role=debt` в модели + маршрутизация (§3) + explicit `role` в `POST`/`PATCH` (§4).
2. BE: подтвердить и, если нужно, поправить учёт наличного `debt_repayment` в
   `drawer_expected_cash` (§5) — **блокер**, без этого не мержить.
3. BE: деплой на staging.
4. FE: `VITE_CASHBOX_DEBT_ROLE=true` на staging → ручной прогон по §9.
5. Опционально: BE-скрипт, предлагающий владельцам компаний с кассами-кандидатами
   (по названию — «карыз», «долг», «задолженность» и т.п. с ролью `pos_main`/`expense_variable`)
   переназначить роль на `debt` через тот же `PATCH`.
6. Prod: BE + `VITE_CASHBOX_DEBT_ROLE=true` в один релиз.

---

## 8. Вопросы к бэкенду (Q1–Q6)

| # | Вопрос |
|---|---|
| **Q1** | Согласны на новую роль `debt` с описанной маршрутизацией (§3) — приоритетнее POS/expense_variable для `debt_repayment`/`supplier_debt_payment`, но не участвует в `pos_prepayment`? |
| **Q2** | **Блокер.** Как сейчас наличный `debt_repayment` учитывается в `drawer_expected_cash` смены (§5)? Через что именно — `cash_sales_total`, отдельный `income_total`, никак? Что нужно поменять, чтобы после переноса `cashbox` на `debt`-кассу поведение не изменилось? |
| **Q3** | Явный `role` в `POST /construction/cashboxes/` (§4.1) — согласны принимать? Игнорировать keyword-fallback, если `role` передан? |
| **Q4** | `PATCH /construction/cashboxes/{id}/ {role}` (§4.2) — согласны реализовать с той же защитой `cashbox_role_required`, что и для удаления последней критичной кассы (переиспользовать из [cashbox-delete-backend.md](./cashbox-delete-backend.md))? |
| **Q5** | Уникальность `role=debt` — жёсткий DB-constraint сразу, или сначала soft-предупреждение (`warnings` в ответе), как временная мера? |
| **Q6** | Готовы ли на разовый скрипт-подсказку (§7, шаг 5) для владельцев компаний с явными кандидатами в `debt` по названию (аналогично найденной «карыз»)? Не обязательно для v1, но закрывает исторические случаи без ручного клика по каждой компании. |

---

## 9. Тест-кейсы (BE)

| # | Сценарий | Ожидание |
|---|---|---|
| 1 | Создание кассы `{name: "Карыз", role: "debt"}` | `201`, `role="debt"`, keyword-fallback не сработал |
| 2 | `PATCH` существующей `pos_main`-кассы (не последней) `{role: "debt"}` | `200`, роль сменилась, `CashFlow` не тронуты |
| 3 | `PATCH` **последней** активной `pos_main` `{role: "debt"}` | `409 cashbox_role_required` |
| 4 | Погашение долга клиента наличными, есть активная `debt`-касса, открыта смена | `CashFlow.cashbox = debt-касса`, `shift_id` = текущая смена |
| 5 | То же — `GET /construction/shifts/{id}/` после операции | `drawer_expected_cash` увеличился на сумму погашения (см. §5) |
| 6 | Погашение долга клиента наличными, **нет** `debt`-кассы | прежнее поведение — cashbox = POS (смена→branch→main) |
| 7 | Оплата долга поставщику, есть `debt`-касса | `CashFlow.cashbox = debt-касса`, `type=expense`, `shift=null`, `affects_shift_drawer=false` |
| 8 | Оплата долга поставщику, **нет** `debt`-кассы | прежнее поведение — `expense_variable` |
| 9 | Checkout в долг с предоплатой (`pos_prepayment`), есть `debt`-касса | предоплата всё равно идёт в POS-кассу, **не** в `debt` |
| 10 | Legacy `PATCH /main/debts/{id}/` с уменьшением суммы, есть `debt`-касса | income в `debt`-кассу, как в п.4 |
| 11 | Создание второй активной `debt`-кассы | по решению Q5 — `201` с `warnings` **или** `400` |

---

## История

| Дата | Автор | Изменение |
|------|-------|-----------|
| 2026-09-11 | nur-market (FE/docs) | Первичный контракт; FE за флагом `VITE_CASHBOX_DEBT_ROLE`; мотивирующий кейс — касса «карыз» с ошибочной ролью `pos_main` |
