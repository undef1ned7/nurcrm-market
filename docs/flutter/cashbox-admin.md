# Flutter: администрирование касс (роль «Долги», удаление/слияние, дубли pos_main)

Три спецификации по управлению кассами компании: новая роль `debt` для учёта долгов, удаление/архивация/слияние касс, и реальный prod-баг с дублями `pos_main`. **Все три раздела — ТЗ/находки, бэкенд НЕ подтверждён живым**, кроме бага в §3, который уже воспроизведён на staging.

**Веб-экраны:**
- Касса (список, создание, удаление): `/crm/kassa`
- Аналитика / Финансы: `/crm/analytics`

**Веб-код (эталон):**
- `src/entities/cash/lib/cashboxMutations.ts` — роли, флаги, guard-функции
- `src/entities/cash/model/cashSlice.ts` — thunks `deleteCashBox`, `bulkDeleteCashBoxes`, `updateCashboxRole`
- `src/features/kassa/ui/Kassa.tsx` — список касс, модалки создания/удаления
- `src/features/kassa/ui/DeleteCashboxModal/DeleteCashboxModal.tsx`
- `src/shared/lib/tools/cashboxResolution.ts` — маршрутизация (см. также [cash-and-cashflows.md](./cash-and-cashflows.md))

**Бэкенд-доки:**
- [cashbox-debt-role-backend.md](../backend/kassa/cashbox-debt-role-backend.md)
- [cashbox-delete-backend.md](../backend/kassa/cashbox-delete-backend.md)
- [pos-main-duplicate-role-bug.md](../backend/kassa/pos-main-duplicate-role-bug.md)
- [auto-cashflows-backend.md](../backend/kassa/auto-cashflows-backend.md)
- [shift-cash-reconciliation-backend.md](../backend/kassa/shift-cash-reconciliation-backend.md)

**Статус (2026-09-11):**

| Компонент | Статус |
|-----------|--------|
| Роль `debt` (бэк) | ❌ **Не реализовано.** ТЗ. Блокер §1.4 не снят — сначала подтвердить учёт наличных в `drawer_expected_cash` |
| Удаление/слияние касс (бэк) | ❌ **Не реализовано.** ТЗ, 9 открытых вопросов (D1–D9) |
| Дубль `pos_main` (баг) | ⚠️ **Подтверждён на staging** реальным ответом API; фикс на бэке не выпущен |
| Веб nur-market | Флаги `VITE_CASHBOX_DEBT_ROLE`, `VITE_CASHBOX_DELETE` — оба **выключены** по умолчанию; клиентский guard от новых дублей `pos_main` уже есть |
| Flutter | **Не реализовывать роль `debt` и удаление/слияние касс до подтверждения бэка.** Обязательно реализовать защиту от дублей ролей (§3.4) — актуально уже сейчас |

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <accessToken>` — см. [auth-and-api-basics.md](./auth-and-api-basics.md).
Таймзона: **Asia/Bishkek (UTC+6)**. Суммы в JSON — **decimal-строки** `"1234.56"`.

---

## Содержание

1. [Роль кассы `debt` (для долгов)](#1-роль-кассы-debt-для-долгов)
2. [Удаление и слияние касс](#2-удаление-и-слияние-касс)
3. [Баг: дубли `pos_main`](#3-баг-дубли-pos_main)
4. [Dart-модели](#4-dart-модели)
5. [Чеклист Flutter](#5-чеклист-flutter)
6. [Связанные документы](#6-связанные-документы)

---

## 1. Роль кассы `debt` (для долгов)

### 1.1 Задача

Владельцы заводят отдельную кассу для учёта долгов (пример с прода — касса «Карыз», кырг. «долг»). Сейчас роль присваивается по ключевым словам в названии, и «карыз» не матчится ни под один keyword → получает `pos_main` по умолчанию, путая деньги с основной кассой продаж (см. §3). Нужна явная роль `debt` + чекбокс «Для долгов» в UI создания кассы, и авто-маршрутизация долговых операций должна идти именно в неё.

### 1.2 Новая роль

```dart
enum CashboxRole {
  posMain,
  posBranch,
  expenseVariable,
  expenseFixed,
  debt,   // NEW — ещё не на проде
}
```

Уникальность (ожидаемая): не более одной активной кассы `role=debt` на компанию, `branch_id IS NULL` (долги — общая касса компании, не по филиалам, в отличие от `pos_branch`).

### 1.3 Маршрутизация (если фича будет включена)

Тела запросов `checkout`/`pay` **не меняются** — вся логика внутри `resolve_cashbox()` на бэке:

| Операция | `source_kind` | Касса, есть `role=debt` | Касса, нет `role=debt` |
|---|---|---|---|
| Погашение долга клиента | `debt_repayment` | `debt`-касса | смена → pos_branch → pos_main (как сейчас) |
| Legacy `PATCH /main/debts/{id}/` | `debt_repayment` | `debt`-касса | pos_main / смена |
| Погашение долга поставщику | `supplier_debt_payment` | `debt`-касса, `shift=null` | `expense_variable`, `shift=null` |
| Предоплата при checkout в долг | `pos_prepayment` | **не участвует** — всегда POS-маршрут | POS-маршрут |

Создание самого долга (продажа в долг без предоплаты, `cashflows: []`) роль `debt` не затрагивает — деньги не двигаются.

### 1.4 КРИТИЧЕСКИЙ РИСК — не включать до подтверждения бэка

**Это главная причина, почему фича заблокирована.** Наличная оплата долга физически попадает в тот же денежный ящик кассира, что и обычные продажи, — даже если запись cashflow теперь идёт в кассу «Долги», а не в POS-кассу смены.

Сейчас (без роли `debt`) расчёт `drawer_expected_cash` смены неявно опирается на то, что `debt_repayment` и `pos_sale` пишутся в **одну и ту же кассу** (`cashbox_id == shift.cashbox_id`). Если ввести отдельную `debt`-кассу и **не поменять** критерий включения в ящик смены — наличные, полученные в счёт погашения долга, перестанут учитываться в `drawer_expected_cash`, хотя физически лежат в ящике. Кассир при закрытии смены увидит расхождение (`cash_diff`), которого на самом деле нет — воспроизведётся тот же класс бага, что уже был исправлен для закупок в [shift-cash-reconciliation-backend.md](../backend/kassa/shift-cash-reconciliation-backend.md), только в обратную сторону (там — недостача из чужих расходов, здесь — необъяснённый излишек).

**Требуемое исправление на бэке:** критерий включения наличного `debt_repayment` в `drawer_expected_cash` смены должен стать `shift_id == self` (независимо от `cashbox_id`), а не `cashbox_id == shift.cashbox_id`, как сейчас. Бэкенд должен явно подтвердить, что именно сейчас суммирует `drawer_expected_cash` (`cash_sales_total`, отдельный `income_total`, или ничего), прежде чем это можно будет проверить.

> **Инструкция Flutter-команде:** роль `debt` должна оставаться **OFF/неиспользуемой** до тех пор, пока бэкенд явно не подтвердит фикс формулы `drawer_expected_cash` (см. тест-кейс 5 в исходном ТЗ: «`GET /construction/shifts/{id}/` после погашения долга наличными → `drawer_expected_cash` увеличился на сумму погашения»). Это не «пока не реализовано» — это **блокер**, зависящий от изменения на бэке, которое пока не подтверждено. Не активировать фичу по одному только наличию эндпоинтов `role=debt` в ответе API — сначала запросить у бэка явное подтверждение по формуле сверки ящика.

### 1.5 API (если/когда фича будет включена бэком)

```http
POST /construction/cashboxes/
```
```json
{ "name": "Карыз", "is_consumption": false, "role": "debt" }
```

```http
PATCH /construction/cashboxes/{id}/
```
```json
{ "role": "debt" }
```

`CashFlow` по погашению долга клиента наличными (ожидаемый вид):

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

`shift_id` заполнен, несмотря на то что `cashbox` — не `shift.cashbox` (см. §1.4).

### 1.6 Флаг клиента

Аналог веба (`VITE_CASHBOX_DEBT_ROLE`, по умолчанию `false`):

```dart
abstract class CashboxDebtRoleConfig {
  /// НЕ включать, пока бэк не подтвердил фикс §1.4.
  static bool get isEnabled =>
      RemoteConfig.instance.cashboxDebtRole ?? false;
}
```

Пока флаг выключен: чекбокса «Для долгов» и кнопки назначения роли в UI нет; создание кассы — без поля `role`, как сейчас.

---

## 2. Удаление и слияние касс

### 2.1 Задача

Ошибочно созданную или лишнюю кассу расходов (и, после уточнения скоупа, дублирующую `pos_main` — см. §3) сейчас нельзя убрать из UI — только руками в БД. Нужны: удаление (мягкое — архивация, или физическое — если касса пустая), опциональное слияние с наследованием отчёта, массовое удаление.

### 2.2 Эндпоинты (ожидаемые — ТЗ)

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/construction/cashboxes/` | список; нужны поля `role`, `is_active`, `is_consumption`, `analytics`, желательно `archived_at`/`merged_into` |
| `DELETE` | `/construction/cashboxes/{id}/?merge_into={target_id}` | удаление/архивация, опционально с переносом истории |
| `POST` | `/construction/cashboxes/bulk-delete/` | массовое удаление с общим наследником (рекомендуется, не факт что будет реализован — см. D9) |

### 2.3 Логика удаления (ожидаемая)

```text
Проверки (в порядке):
1. Касса принадлежит компании — иначе 404
2. Права owner/admin — иначе 403
3. Открыта смена на кассе — 409 cashbox_has_open_shift
4. Есть pending-движения/заявки на кассе — 409 cashbox_has_pending
5. Последняя активная касса роли {pos_main, expense_variable, debt}
   (или последняя pos_branch на branch_id), AUTO_CASHFLOWS=true — 409 cashbox_role_required
   (не блокирует, если задан merge_into на активную кассу ТОЙ ЖЕ роли)

Если merge_into задан:
   → перенести все CashFlow source → target, архивировать source (НЕ хардделить)
Иначе если у кассы была активность (CashFlow/Shift):
   → is_active=false, archived_at/archived_by (мягкая архивация, CashFlow не трогать)
Иначе (пустая касса):
   → физическое удаление
```

Архивная касса: не возвращается в списке без `?include_archived=1`; не участвует в `resolve_cashbox`; явный `cashbox_id` на неё → `400 cashbox_inactive`. Повторный `DELETE` архивной кассы — `204` (идемпотентно), уже удалённой физически — `404`.

### 2.4 Ответы

Успех: `204 No Content` (допустимо `200` с телом `{id, is_active, archived_at}`).

| `code` | HTTP | Когда |
|---|---|---|
| `cashbox_has_open_shift` | 409 | есть открытая смена на кассе |
| `cashbox_role_required` | 409 | последняя активная касса критичной роли, авто-cashflows включены |
| `cashbox_has_pending` | 409 | есть pending-движения/заявки |
| `merge_target_invalid` | 400/409 | `merge_into` невалиден (не найден/чужая компания/архивный/равен источнику/цикл в batch) |
| — | 403 | не owner/admin |
| — | 404 | касса не найдена/чужая/уже удалена |
| — | 405/501 | эндпоинт ещё не реализован на сервере |

На `404/405/501` показывать: «Удаление кассы пока недоступно на сервере» — не считать это подтверждением фичи.

### 2.5 Слияние (`merge_into`)

```http
DELETE /construction/cashboxes/{id}/?merge_into={target_id}
```

Переносит все `CashFlow` источника (`source`) на кассу-наследника (`target`), затем архивирует `source` (без хардделита — иначе ломаются исторические `Shift.cashbox_id` и старые ссылки). Отчёт `target` после этого включает историю `source` через обычную агрегацию по `cashbox_id`.

Валидация `target`: та же компания, `is_active=true`, `target.id != source.id`, `target` не входит в тот же batch удаляемых id (иначе цикл A→B, B→A). Роль `target` может отличаться от роли `source` — бэк технически не блокирует, но это ответственность пользователя (показывать предупреждение о несовпадении ролей).

**Открыто (D8):** переносится ли `Shift.cashbox_id` вместе с `CashFlow` — по умолчанию предполагается **не переносить** (не рвёт `payment_breakdown` закрытых смен).

Отчёт по архивной (слитой) `source` за периоды до слияния становится **пустым** — это ожидаемо (история физически в `target`), но ответ должен нести маркер:

```json
{
  "cashbox_id": "source-uuid",
  "is_active": false,
  "merged_into": { "id": "target-uuid", "name": "Основная касса компании" },
  "summary": { "total_income": "0.00", "total_expense": "0.00", "operations_count": 0 }
}
```

### 2.6 Массовое удаление

```http
POST /construction/cashboxes/bulk-delete/
```
```json
{ "ids": ["cb-1", "cb-2", "cb-3"], "merge_into": "cb-target" }
```

```json
{
  "succeeded": ["cb-1", "cb-2"],
  "failed": [ { "id": "cb-3", "code": "cashbox_role_required", "detail": "…" } ]
}
```

Атомарность по каждой кассе отдельно (не по всему batch) — одна непрошедшая проверки касса не блокирует остальные.

**Fallback, если `bulk-delete/` не реализован (404/405/501):** клиент идёт по одной `DELETE .../?merge_into=...` последовательно и сам собирает `succeeded`/`failed`. Функционально то же самое, но не атомарно и медленнее.

### 2.7 Открытые вопросы к бэкенду

Ни один из этих вопросов пока не закрыт — до ответов бэка функция остаётся спецификацией, не подтверждённой живым контрактом.

| # | Вопрос |
|---|---|
| **D1** | `DELETE` возвращает `204` или `200` + тело? |
| **D2** | Архивная касса скрывается из `GET .../cashboxes/` по умолчанию (нужен `?include_archived=1`) или отдаётся всегда с `is_active:false`? |
| **D3** | Правило «последняя роль-критичная касса» (§2.3 п.5) проверяется всегда или только при `AUTO_CASHFLOWS=true`? |
| **D4** | `cashbox_has_pending` блокирует при любом `pending` на кассе, или только при заявках `edit/cancel`? |
| **D5** | Нужен ли эндпоинт «восстановить из архива» (`POST .../{id}/restore/`)? |
| **D6** | Семантика `merge_into` — перенос `CashFlow.cashbox_id` на target + архивация source, или другая модель (target физически поглощает source, source хардделится)? |
| **D7** | Если роль `source` отличается от роли `target`, и `source` была последней своей роли — после слияния `resolve_cashbox` для этой роли должен вернуть `400 cashbox_unresolvable`? |
| **D8** | Переносится ли `Shift.cashbox_id` вместе с `CashFlow` при слиянии, или исторические смены остаются привязаны к архивной `source`? |
| **D9** | `bulk-delete/` — отдельный эндпоинт (атомарно по кассе) реализуется, или клиенту закладываться на fallback из N последовательных `DELETE` как основной путь? |

### 2.8 Флаг клиента

Аналог веба (`VITE_CASHBOX_DELETE`, по умолчанию `false`). Пока выключен — кнопок удаления/слияния в UI нет, поведение не меняется.

---

## 3. Баг: дубли `pos_main`

### 3.1 Что подтверждено на проде (staging, 2026-09-11)

Реальный ответ `GET /construction/cashboxes/` для одной компании показал **7 касс, из них 4 с `role: "pos_main"`**:

| `name` | `role` | `is_consumption` |
|---|---|---|
| карыз | `pos_main` | `false` |
| Расход | `pos_main` | `false` |
| Касса 2 | `pos_main` | `false` |
| Основная касса компании | `pos_main` | `false` |
| Касса филиала номер 1 | `pos_branch` | `false` |
| Переменные расходы | `expense_variable` | `false` |
| Постоянные расходы | `expense_fixed` | `false` |

Ключевое наблюдение: `is_consumption` **не влияет** на назначение `role` — роль присваивается только эвристикой по ключевым словам в названии кассы (`переменн`, `постоянн`, `филиал`, `основн`). Всё, что не подошло, **по умолчанию получает `pos_main`** — независимо от намерения пользователя и от чекбокса «Прочие расходы». Отсюда «карыз» (касса для долгов) и «Расход» (касса для расходов) обе оказались `pos_main`.

Это не разовый мусор старой миграции — воспроизводимо сегодня через штатный UI создания кассы (`POST /construction/cashboxes/ {name, is_consumption}` без `role`/`branch_id` — клиент их никогда не передаёт, всё решает keyword-fallback на бэке).

### 3.2 Почему это ломает работу

`resolve_cashbox()` в задокументированном виде (см. [auto-cashflows-backend.md](../backend/kassa/auto-cashflows-backend.md)) **предполагает ровно одну активную `pos_main`-кассу на компанию** — шаг маршрутизации при отсутствии смены/филиала возвращает `Cashbox WHERE company, role=pos_main, is_active` в единственном числе.

При 4 активных `pos_main` **фактическое поведение бэка не подтверждено** — неизвестно, бросает ли `_get_unique_cashbox` исключение (`MultipleObjectsReturned`), берёт `.first()` по недетерминированному порядку, или делает что-то ещё. Это значит: разные вызовы (`open shift`, `checkout` без смены, `pay debt` без филиала) в рамках одной и той же компании могут попадать в **разные** кассы из четырёх, и деньги «размазываются» так, что пользователь и клиент считают это одной «основной кассой», а по факту это не так. Косвенное подтверждение прямо в данных staging: у кассы «карыз» есть `sales_count: 4`, `sales_total: 36050.00`, но `income_total: 0.00` — продажи есть, прихода по кассе нет.

### 3.3 Инструкция Flutter-команде

**Никогда не предполагать, что у компании ровно одна касса роли `pos_main` или `expense_variable`.** Поведение бэка при дублях не определено и не гарантировано на клиенте воспроизводить корректно.

- Если `GET /construction/cashboxes/` возвращает **больше одной** активной кассы с одинаковой ролью (`pos_main`, `expense_variable`, `expense_fixed`) — не выбирать автоматически первую (`cashBoxes[0]` / `cashBoxes.firstWhere(role: ...)`) для отображения баланса/аналитики по умолчанию. Показывать пикер кассы или явное предупреждение пользователю («найдено несколько касс с одной ролью — выберите нужную»), а не молча выбирать одну.
- Для аналитики/финансов с дефолтным фильтром по «основной кассе» — при дублях явно уведомлять, что дефолт может не совпадать с той кассой, куда реально идёт checkout (см. §3.2), и предлагать выбор вручную.
- При создании новой кассы (`POST /construction/cashboxes/`, поля `{name, is_consumption}` — `role`/`branch_id` клиент пока не передаёт) — если у компании уже есть активная `pos_main` и введённое название не содержит ключевых слов расходов (`расход`, `переменн`, `постоянн`, `прочих`, `прочие`) и чекбокс «Прочие расходы» не отмечен — предупредить пользователя перед созданием, что новая касса, скорее всего, получит роль `pos_main` по умолчанию (веб уже делает это, см. `hasActivePosMainCashbox` в `cashboxMutations.ts`). Это снижает вероятность новых дублей, но не устраняет проблему полностью — конечное решение за бэком (см. вопросы M1–M5 в исходном документе).

---

## 4. Dart-модели

```dart
enum CashboxRole {
  posMain,
  posBranch,
  expenseVariable,
  expenseFixed,
  debt,   // ЗАБЛОКИРОВАНО на бэке — не активировать до §1.4
}

class Cashbox {
  final String id;
  final String name;
  final CashboxRole? role;
  final String? branchId;
  final String balance;
  final String currency;
  final bool isActive;
  final DateTime? archivedAt;
  final String? archivedById;
  final String? mergedIntoId;   // если касса слита с другой (ТЗ, не подтверждено бэком)
  final CashboxAnalytics? analytics;
}

/// Группировка касс по роли — используйте для обнаружения дублей (§3.3).
Map<CashboxRole, List<Cashbox>> groupActiveCashboxesByRole(List<Cashbox> boxes) {
  final out = <CashboxRole, List<Cashbox>>{};
  for (final b in boxes) {
    if (!b.isActive || b.role == null) continue;
    out.putIfAbsent(b.role!, () => []).add(b);
  }
  return out;
}

/// true, если найдены дубли singleton-ролей (pos_main / expense_variable / expense_fixed / debt).
bool hasAmbiguousCashboxRoles(List<Cashbox> boxes) {
  const singleton = {
    CashboxRole.posMain,
    CashboxRole.expenseVariable,
    CashboxRole.expenseFixed,
    CashboxRole.debt,
  };
  final grouped = groupActiveCashboxesByRole(boxes);
  return grouped.entries.any((e) => singleton.contains(e.key) && e.value.length > 1);
}
```

```json
// GET /construction/cashboxes/ — код ошибки удаления
{ "detail": "По кассе есть открытая смена. Закройте смену перед удалением.", "code": "cashbox_has_open_shift" }
```

---

## 5. Чеклист Flutter

### Роль `debt`

- [ ] **Не реализовывать / не включать** роль `debt` в UI до явного подтверждения бэком фикса `drawer_expected_cash` (§1.4) — это блокер, не «пока не сделано»
- [ ] Если фича когда-либо включится флагом — сначала прогнать тест-кейс «наличное погашение долга → `drawer_expected_cash` вырос на сумму погашения» на staging
- [ ] Чекбокс «Для долгов» и назначение роли существующей кассе — за отдельным remote-config флагом, по умолчанию `false`

### Удаление / слияние касс

- [ ] Не реализовывать `DELETE`/`bulk-delete` в UI, пока бэк не подтвердил ответы D1–D9
- [ ] Обрабатывать `404/405/501` как «функция недоступна на сервере», а не как ошибку операции
- [ ] Если фича включится — модалка удаления должна поддерживать `merge_into` и явно предупреждать при разных ролях source/target

### Дубли ролей (актуально уже сейчас)

- [ ] Никогда не предполагать ровно одну кассу роли `pos_main`/`expense_variable`/`expense_fixed` на компанию
- [ ] `hasAmbiguousCashboxRoles` (или аналог) перед авто-выбором кассы для аналитики/дефолтов
- [ ] При обнаружении дублей — пикер кассы или предупреждение, не тихий `.first()`/`[0]`
- [ ] Предупреждение перед созданием кассы, если новое название не матчится под keyword-эвристику и есть риск получить `pos_main` по умолчанию

---

## 6. Связанные документы

| Документ | Тема |
|----------|------|
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Полный контракт касс, cashflows, смен, маршрутизации |
| [auth-and-api-basics.md](./auth-and-api-basics.md) | Авторизация, базовые заголовки, формат ошибок |
