# Удаление кассы (+ наследование отчёта)

**Страницы:** `/crm/kassa` (список касс, `CafeKassa` → `CashboxList`)
**Статус:** фронт готов за флагом `VITE_CASHBOX_DELETE` (по умолчанию выкл) · **бэкенд — ТЗ к реализации**
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

Связанные эндпоинты:

| Метод | Путь | Зачем |
|---|---|---|
| `GET` | `/construction/cashboxes/` | список касс компании (нужны поля `role`, `is_active`, `is_consumption`, `analytics`) |
| `POST` | `/construction/cashboxes/` | создание кассы (`{ name, is_consumption }`) — **уже есть** |
| `PATCH` | `/construction/cashboxes/{id}/` | правка (`name`) — **уже есть** |
| **`DELETE`** | **`/construction/cashboxes/{id}/?merge_into={target_id}`** | **NEW — удаление/архивация кассы, опционально с переносом истории в другую** |
| **`POST`** | **`/construction/cashboxes/bulk-delete/`** | **NEW (рекомендуется) — массовое удаление с общим наследником** |

Читать вместе с: [auto-cashflows-backend.md](./auto-cashflows-backend.md) (`resolve_cashbox`, роли касс, reject cascade),
[shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md), [cashbox-reports-backend.md](./cashbox-reports-backend.md),
[pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md) (типичный кейс для наследования — слияние дублей `pos_main`),
[cashbox-debt-role-backend.md](./cashbox-debt-role-backend.md) (роль `debt`).

**Обновление (2026-09-11):** добавлено наследование отчёта при удалении (§7) и массовое удаление (§8) —
по запросу клиента: «после удаления одной кассы вторая должна наследовать отчёт первой; если выбрано
много касс — галочка "Наследовать"/"Нет"». Также снято ограничение «только кассы прочих расходов» —
теперь можно удалять и дублирующие `pos_main` (не последнюю), см. §3.1.5 и §11 D6.

---

## 1. Задача клиента

> «Нужно, чтобы можно было удалять кассу прочих расходов».

Сейчас кассу можно только создать (`POST`) и переименовать (`PATCH`). Ошибочно созданную
или лишнюю кассу расходов убрать из UI нельзя — только руками в БД.

**«Касса прочих расходов»** на фронте — касса, созданная с `is_consumption: true`
(чекбокс «Прочие расходы» в модалке создания). В ролевой модели это `expense_variable`
или `expense_fixed` (см. [auto-cashflows-backend.md](./auto-cashflows-backend.md) §«Модель данных»).

Фронт показывает кнопку «Удалить» для касс, где `role ∈ {expense_variable, expense_fixed, debt}`
**или** `is_consumption === true` **или** название содержит «расход»/«долг»/«карыз», **а также**
для `pos_main`, если у компании таких активных касс больше одной (дубли, см.
[pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md)). Единственную оставшуюся
`pos_main` / `pos_branch` фронт не предлагает удалить — но финальную защиту от удаления
последней критичной кассы роли обеспечивает **бэк** (§3.1.5, код `cashbox_role_required`).

---

## 2. Почему нельзя просто `DELETE` строки

Каждая касса — узел учёта. На кассу расходов завязано:

| Что | Последствие жёсткого удаления |
|---|---|
| `CashFlow` (лента `/construction/cashflows/`) | пропадут движения; ломается reject cascade по `source_id` |
| Отчёт кассы (день/месяц), аналитика «Финансы» | суммы «поедут», исторические периоды не сойдутся |
| `payment_breakdown` закрытых смен | пересчёт закрытой бухгалтерии |
| `resolve_cashbox` для `warehouse_purchase`, `procurement_receipt`, `supplier_return`, `defect_writeoff`, `supplier_debt_payment` | при `AUTO_CASHFLOWS=true` эти 5 операций упадут с `400 cashbox_unresolvable`, если удалена **последняя** активная `expense_variable` |
| Открытая смена (для POS-касс) | «висячая» смена без кассы |

Поэтому — **мягкое удаление (архивация)** для касс с историей и **физическое** — только
для пустых.

---

## 3. Поведение бэка

`DELETE /construction/cashboxes/{id}/`

### 3.1. Проверки (до любых изменений)

1. Касса принадлежит `request.user.company`, иначе `404`.
2. Права: `request.user` — `owner` или `admin`, иначе `403`.
3. **Открытая смена** на этой кассе (`Shift.status = open`) → `409 cashbox_has_open_shift`.
4. **Pending-движения / заявки** на кассе
   (`CashFlow` со `status='pending'` и `cashbox_id = {id}`, включая `request_kind ∈ {edit, cancel}`)
   → `409 cashbox_has_pending`.
5. **Роль обязательна для авто-операций.** Если удаляемая касса — **последняя активная**
   касса своей роли у компании среди `{pos_main, expense_variable, debt}` (для `pos_branch`
   — последняя активная **на этот `branch_id`**), и `AUTO_CASHFLOWS=true` для компании →
   `409 cashbox_role_required`. Это правило одинаково применяется и к единичному `DELETE`,
   и к каждой кассе в `bulk-delete` (§8) — если хотя бы одна из пачки последняя в своей
   роли, эта конкретная касса не удаляется (остальные — по обычным правилам), см. §8.3.
   `expense_fixed` пока без авто-операций — для неё это правило можно не применять (но
   симметрично добавить, если появятся фиксированные расходы).
   **Важно:** если для удаляемой кассы указан `merge_into` (§7) на **активную** кассу
   **той же роли**, правило `cashbox_role_required` не блокирует — роль не «теряется»,
   переходит к наследнику.

### 3.2. Решение: архив, физическое удаление или слияние

```python
merge_into_id = request.query_params.get("merge_into")

if merge_into_id:
    # Наследование отчёта — см. §7. Переносит CashFlow на target, затем архивирует source.
    return merge_and_archive_cashbox(cashbox, target_id=merge_into_id, user=request.user)

had_activity = (
    CashFlow.objects.filter(cashbox_id=cashbox.id).exists()
    or Shift.objects.filter(cashbox_id=cashbox.id).exists()
)

if had_activity:
    cashbox.is_active = False
    cashbox.archived_at = timezone.now()
    cashbox.archived_by = request.user
    cashbox.save(update_fields=["is_active", "archived_at", "archived_by"])
    # CashFlow НЕ трогаем — отчёты и аналитика за прошлые периоды остаются верными
    return Response(status=204)          # или 200 + тело, см. §4
else:
    cashbox.delete()                     # пустая касса — можно физически
    return Response(status=204)
```

### 3.3. Что значит «архивная касса»

- **Не** возвращается в `GET /construction/cashboxes/` без явного `?include_archived=1`
  (по умолчанию список — только `is_active=true`).
- **Не** участвует в `resolve_cashbox` (ни как явный `cashbox_id` override, ни по роли).
  Явный `cashbox_id` на архивную кассу → `400 cashbox_inactive` (код уже есть в
  [auto-cashflows-backend.md](./auto-cashflows-backend.md) §«Ошибки»).
- Отчёты `/construction/cashboxes/{id}/report/` по архивной кассе **продолжают работать**
  (история), но касса помечена `is_active:false` в ответе.
- Аналитика `/construction/cashbox-reports/analytics/` без `cashbox` — по умолчанию
  агрегирует только активные кассы; архивные включать при явном `cashbox={id}`.

### 3.4. Идемпотентность

Повторный `DELETE` уже архивной кассы → `204` (no-op), уже физически удалённой → `404`.

---

## 4. Ответы

### Успех

`204 No Content` — достаточно (фронт убирает строку из списка и перезапрашивает `GET`).

Допустимо `200` с телом (фронт возьмёт `id` из запроса, тело не обязательно):

```json
{ "id": "cb-uuid", "is_active": false, "archived_at": "2026-09-09T12:30:00+06:00" }
```

### Ошибки (DRF-совместимо)

```json
{ "detail": "…", "code": "cashbox_has_open_shift" }
```

| `code` | HTTP | Когда | Текст фронта |
|---|---|---|---|
| `cashbox_has_open_shift` | `409` | есть открытая смена на кассе | «По кассе есть открытая смена. Закройте смену перед удалением.» |
| `cashbox_role_required` | `409` | последняя активная касса роли, нужной авто-операциям | «Это последняя касса для расходов… Создайте другую, затем удалите эту.» |
| `cashbox_has_pending` | `409` | есть `pending` движения/заявки на кассе | «По кассе есть неодобренные операции или заявки. Разберите их перед удалением.» |
| `merge_target_invalid` | `400`/`409` | `merge_into` не найден / чужая компания / архивный / равен источнику / участвует в том же batch как источник (цикл) | «Не удалось перенести отчёт в выбранную кассу…» |
| — | `403` | не owner/admin | стандартный текст прав |
| — | `404` | касса не найдена / чужая компания / уже удалена | «Касса не найдена — возможно, уже удалена.» |
| — | `405` / `501` | эндпоинт ещё не реализован | «Удаление кассы пока недоступно на сервере.» |

Фронт читает `error.response.data.code`; на `404/405/501` — по HTTP-статусу
(`src/entities/cash/lib/cashboxMutations.ts` → `cashboxDeleteErrorCode`).

---

## 5. Поля в `GET /construction/cashboxes/` (нужны фронту)

Список уже отдаёт `id`, `name` / `department_name`, `analytics`. Для кнопки «Удалить»
фронт использует (в порядке приоритета):

| Поле | Тип | Зачем |
|---|---|---|
| `role` | enum \| null | `expense_variable` / `expense_fixed` → показать кнопку; `pos_*` → скрыть |
| `is_consumption` | bool | legacy-признак кассы расходов (если `role` пуст) |
| `is_active` | bool | не показывать архивные (или показывать с бейджем «в архиве») |

Если `role` в списке пока не отдаётся — фронт падает на `is_consumption` и эвристику
по названию; желательно добавить `role` (полезно и для отладки маршрутизации).

Опционально для будущего UI архива: `archived_at`, `archived_by`.

---

## 6. Миграция

```python
# Cashbox
#   is_active    = BooleanField(default=True)             # уже есть
#   archived_at  = DateTimeField(null=True, blank=True)    # NEW (опционально)
#   archived_by  = ForeignKey(User, null=True, blank=True, on_delete=SET_NULL)  # NEW (опц.)
#   merged_into  = ForeignKey("self", null=True, blank=True,
#                              related_name="merged_from", on_delete=SET_NULL)  # NEW, см. §7
```

Данные не мигрируются — существующие кассы остаются `is_active=true`, `merged_into=null`.

---

## 7. Наследование отчёта (`merge_into`)

> Запрос клиента: «После удаления одной кассы вторая, которая осталась, должна наследовать
> отчёт первой кассы».

### 7.1. Смысл

При `DELETE /construction/cashboxes/{id}/?merge_into={target_id}` бэк **переносит** все
`CashFlow` удаляемой кассы (`source`) на кассу-наследника (`target`), а затем архивирует
`source` как в §3.2 (никогда не хардделит — иначе исторические `Shift.cashbox_id` и старые
ссылки/закладки сломаются). После переноса отчёт `target` (`/construction/cashboxes/{target_id}/report/`,
её `balance`/`analytics`) естественным образом включает историю `source` — это обычная
агрегация по `cashbox_id`, отдельной логики на чтение не нужно.

Без `merge_into` — прежнее поведение §3.2 (чистый архив, без переноса).

### 7.2. Что переносится

```python
@transaction.atomic
def merge_and_archive_cashbox(source: Cashbox, target_id: str, user) -> Response:
    target = get_target_or_400(source.company, target_id, exclude_id=source.id)  # см. 7.3

    CashFlow.objects.filter(cashbox_id=source.id).update(cashbox_id=target.id)
    # Опционально: Shift.objects.filter(cashbox_id=source.id).update(cashbox_id=target.id)
    #   — см. вопрос D8. Если НЕ переносить — исторические Shift продолжат
    #   ссылаться на архивную source (это ок, source не хардделится).

    source.is_active = False
    source.archived_at = timezone.now()
    source.archived_by = user
    source.merged_into = target
    source.save(update_fields=["is_active", "archived_at", "archived_by", "merged_into"])

    # target.balance / target.analytics пересчитываются обычной агрегацией
    # по CashFlow — отдельно ничего обновлять не нужно, если balance не денормализован.
    # Если balance денормализован (кэш-поле) — пересчитать/увеличить его на перенесённую сумму.

    return Response(status=204)
```

### 7.3. Валидация `merge_into` (до переноса, в одной транзакции с `select_for_update`)

| Проверка | Ошибка |
|---|---|
| `target` существует и принадлежит той же компании | `400 merge_target_invalid` |
| `target.is_active == True` | `400 merge_target_invalid` (нельзя наследовать в архивную) |
| `target.id != source.id` | `400 merge_target_invalid` |
| В batch-запросе (§8) `target` не входит в список удаляемых `ids` | `400 merge_target_invalid` (иначе цикл: A→B, B→A) |
| Права на `target` — та же компания, что и у `source` (уже покрыто первой проверкой) | — |

**Роль `target` может отличаться от роли `source`** — бэк не блокирует (например, слияние
`pos_main`-дубля в другую `pos_main` — штатный кейс; слияние `pos_main` в `expense_variable` —
разрешено технически, но это ответственность пользователя; фронт показывает предупреждение,
см. `mergeRoleMismatchWarning`, но не блокирует).

### 7.4. Что показывать по архивной (слитой) кассе

`GET /construction/cashboxes/{source_id}/report/` после слияния:
- Исторические данные **до момента слияния** относятся к `source` — если `CashFlow` уже
  переехали на `target`, отчёт по `source` за прошлые периоды станет **пустым**. Это ожидаемо
  (история физически теперь в `target`) — но стоит явно отдавать маркер:

```json
{
  "cashbox_id": "source-uuid",
  "is_active": false,
  "merged_into": { "id": "target-uuid", "name": "Основная касса компании" },
  "summary": { "total_income": "0.00", "total_expense": "0.00", "operations_count": 0 }
}
```

Фронт (при появлении UI архива в будущем) покажет «Эта касса объединена с «Х» → ссылка на её отчёт».
Для v1 такого экрана нет — важно только не отдавать 404/500 по старым закладкам.

### 7.5. Влияние на `resolve_cashbox` (P0 — не потерять маршрутизацию)

Если `source` была `role=pos_main` / `expense_variable` / `debt` и после слияния это была
**последняя** активная касса своей роли — целевая роль должна «переехать» вместе с историей:
простейший вариант — **`target` уже имеет ту же роль** (типичный кейс: слияние дублей, §11 D6),
тогда всё работает само. Если роли различаются и `source` была последней своей роли —
`resolve_cashbox` для этой роли после слияния должен вернуть `400 cashbox_unresolvable`,
как и для обычного архива без наследника (роль не переносится автоматически на кассу другой
роли — см. вопрос D7 в §11).

---

## 8. Массовое удаление (`bulk-delete`)

> Запрос клиента: «Если выбрано много касс, добавим галочку "Наследовать" или "Нет" для тех,
> кто не хочет, чтобы происходило наследование».

Фронт даёт выбрать несколько касс чекбоксами в списке `/crm/kassa` и удалить их одной модалкой
с **одним общим** наследником (или без наследования вовсе).

### 8.1. Эндпоинт (рекомендуется)

```http
POST /construction/cashboxes/bulk-delete/
Content-Type: application/json

{
  "ids": ["cb-1", "cb-2", "cb-3"],
  "merge_into": "cb-target"   // или null — без наследования
}
```

**Ответ 200:**

```json
{
  "succeeded": ["cb-1", "cb-2"],
  "failed": [
    { "id": "cb-3", "code": "cashbox_role_required", "detail": "…" }
  ]
}
```

Атомарность **по каждой кассе отдельно**, не по всему batch: одна не прошедшая проверки
(§3.1, §8.3) не должна блокировать остальные. Обрабатывать в одной транзакции на кассу
(`select_for_update` на неё + на `target`), не на весь список сразу.

### 8.2. Fallback, если эндпоинта нет

Пока `bulk-delete/` не реализован — фронт при `404/405/501` идёт по одной
`DELETE /construction/cashboxes/{id}/?merge_into=...` последовательно и сам собирает
`succeeded`/`failed` (`bulkDeleteCashBoxes` в `cashSlice.ts`). Функционально одинаково,
но не атомарно и медленнее на больших выборках — bulk-эндпоинт предпочтителен.

### 8.3. Валидация в batch

| Проверка | Результат |
|---|---|
| `merge_into` совпадает с одним из `ids` | вся операция `400 merge_target_invalid` (цикл) |
| Дубли в `ids` | схлопнуть, обработать один раз |
| Часть `ids` — последняя активная касса своей роли (§3.1.5) без подходящего `merge_into` | эта касса → `failed` с `cashbox_role_required`, остальные обрабатываются штатно |
| Часть `ids` не найдена / чужая компания | эта касса → `failed` с `404`-эквивалентом в теле, остальные — штатно |
| Все `ids` успешно уходят в архив/удаляются, `merge_into` задан | все переносятся в одну `target` |

---

## 9. Тест-кейсы (BE)

| # | Сценарий | Ожидание |
|---|---|---|
| 1 | `DELETE` кассы `expense_variable` без движений и смен | `204`, строка физически удалена |
| 2 | `DELETE` кассы `expense_variable` с движениями | `204`, `is_active=false`, `CashFlow` на месте |
| 3 | Отчёт `/cashboxes/{id}/report/` по архивной кассе | работает, суммы прежние, `is_active:false` |
| 4 | `GET /construction/cashboxes/` после архивации | архивной кассы нет в ответе |
| 5 | `resolve_cashbox` для `warehouse_purchase` после архивации **последней** `expense_variable` при `AUTO_CASHFLOWS=true` | до `DELETE` вернётся `409 cashbox_role_required`, касса не тронута |
| 6 | То же, но есть вторая активная `expense_variable` | `204`, вторая касса становится целевой для авто-операций |
| 7 | `DELETE` кассы с открытой сменой | `409 cashbox_has_open_shift` |
| 8 | `DELETE` кассы с `pending` движением | `409 cashbox_has_pending` |
| 9 | `DELETE` под ролью кассир/менеджер | `403` |
| 10 | `DELETE` кассы чужой компании | `404` |
| 11 | Повторный `DELETE` архивной кассы | `204` (no-op) |
| 12 | Явный `cashbox_id` архивной кассы в авто-операции / ручном cashflow | `400 cashbox_inactive` |
| 13 | `AUTO_CASHFLOWS=false` у компании, `DELETE` последней `expense_variable` | `204` (правило §3.1.5 не срабатывает) |
| 14 | `DELETE ?merge_into=target` — 3 движения на source | `204`; все 3 `CashFlow.cashbox_id == target.id`; `source.is_active=false`, `source.merged_into=target` |
| 15 | Отчёт `target` после слияния | `total_income`/`total_expense` включают перенесённые суммы |
| 16 | Отчёт `source` после слияния | пусто/`0.00` за прошлые периоды, есть `merged_into` в ответе |
| 17 | `merge_into` = несуществующий id / чужая компания / id самой `source` | `400/409 merge_target_invalid`, ничего не изменилось |
| 18 | `merge_into` на архивную кассу | `400/409 merge_target_invalid` |
| 19 | Слияние последней `pos_main` в другую активную `pos_main` | `204`, роль не теряется, `resolve_cashbox` для `pos_main` теперь возвращает `target` |
| 20 | `bulk-delete` с 3 id, `merge_into=target`, все валидны | `200 {succeeded: [3 id], failed: []}`, все 3 перенесены в `target` |
| 21 | `bulk-delete`, один из 3 — последняя активная роль без валидного `merge_into` | `200 {succeeded: [2 id], failed: [{id, code: cashbox_role_required}]}`, два прошли, третий — нет |
| 22 | `bulk-delete`, `merge_into` совпадает с одним из `ids` | `400 merge_target_invalid` на весь batch |
| 23 | `bulk-delete` без `bulk-delete/` на сервере (для проверки фронта) | `404/405/501` → фронт делает N последовательных `DELETE` (не тест BE, но зафиксировать контракт) |

---

## 10. Контракт фронта

| Файл | Роль |
|---|---|
| `src/entities/cash/lib/cashboxMutations.ts` | флаги `isCashboxDeleteEnabled`/`isCashboxDebtRoleEnabled`, `isConsumptionCashbox`/`isPosMainCashbox`/`isDebtCashbox`, `cashboxRoleLabel`, `selectMergeCandidates`, `mergeRoleMismatchWarning`, `cashboxDeleteErrorCode/Message` |
| `src/entities/cash/model/cashSlice.ts` | thunks `deleteCashBox({id, mergeInto})`, `bulkDeleteCashBoxes({ids, mergeInto})` (с graceful fallback на единичные `DELETE`), `updateCashboxRole` |
| `src/features/kassa/ui/Kassa.tsx` | список касс (`CashboxList`): чекбоксы выбора, кнопка «Удалить выбранные», роль-бейдж, кнопка «Для долгов» |
| `src/features/kassa/ui/DeleteCashboxModal/DeleteCashboxModal.tsx` | модалка подтверждения (единичная/массовая) с чекбоксом «Наследовать отчёт» + выбором наследника |
| `.env.example` | `VITE_CASHBOX_DELETE`, `VITE_CASHBOX_DEBT_ROLE` |

### Поведение до выката BE

- Флаг `VITE_CASHBOX_DELETE` выключен → кнопок нет, поведение не меняется.
- Если флаг включат раньше BE — `DELETE`/`bulk-delete/` вернёт `404/405`, фронт покажет
  «Удаление кассы пока недоступно на сервере», касса не тронута.
- Модалка удаления сама решает, показывать ли выбор наследника: если кандидатов на
  наследование нет (нет других активных касс) — просто предупреждает, что наследовать некуда.

### Порядок выката

1. BE: `DELETE`-эндпоинт (+ `merge_into`) + `role`/`is_active`/`merged_into` в списке + тесты §9.
2. BE: `bulk-delete/` (рекомендуется, иначе фронт справится fallback'ом).
3. BE: деплой на staging.
4. FE: `VITE_CASHBOX_DELETE=true` на staging → ручной прогон: пустая касса → физическое
   удаление; касса с движениями → архив; удаление с наследованием → отчёт наследника вырос;
   массовое удаление 2+ касс с одним наследником.
5. Prod: BE + `VITE_CASHBOX_DELETE=true` в один релиз.

---

## 11. Вопросы к бэкенду (D1–D9)

| # | Вопрос |
|---|---|
| **D1** | `DELETE` возвращает `204` или `200` + тело? Фронт готов к обоим. |
| **D2** | Архивная касса: скрывать из `GET /construction/cashboxes/` по умолчанию (нужен `?include_archived=1`)? Или отдавать всегда с `is_active:false`, а фильтровать фронт? Предпочтительно — **скрывать по умолчанию**. |
| **D3** | Правило §3.1.5 (последняя роль-критичная касса): проверяем всегда или только при `AUTO_CASHFLOWS=true` у компании? Предложено — только при включённых авто-cashflows. |
| **D4** | `cashbox_has_pending` — блокируем при любом `pending` на кассе, или только при заявках `edit/cancel`? Предложено — при любом `pending` (движение или заявка). |
| **D5** | Нужен ли эндпоинт «восстановить из архива» (`POST /construction/cashboxes/{id}/restore/`)? Для v1 не требуется, фронт-UI архива нет. |
| **D6** | Согласны с семантикой `merge_into` = перенос `CashFlow.cashbox_id` на target + архивация source (§7)? Или предпочитаете другую модель (например, `target` физически поглощает `source`, а `source` хардделится)? Фронт рассчитывает именно на «архив + перенос», чтобы не рвать исторические ссылки. |
| **D7** | §7.5: если роль `source` отличается от роли `target` и `source` была последней своей роли — после слияния `resolve_cashbox` для этой роли должен вернуть `400 cashbox_unresolvable` (как обычный архив без наследника)? Подтвердить. |
| **D8** | Переносить ли `Shift.cashbox_id` вместе с `CashFlow` при слиянии, или оставлять исторические смены привязанными к архивной `source`? Предложено — **не переносить** (проще, не рвёт `payment_breakdown` закрытых смен). |
| **D9** | `bulk-delete/`: готовы реализовать отдельным эндпоинтом (§8.1, атомарно по каждой кассе), или фронту закладываться на fallback из N последовательных `DELETE` (§8.2) как основной путь? |

---

## История

| Дата | Автор | Изменение |
|------|-------|-----------|
| 2026-09-09 | nur-market (FE/docs) | Первичный контракт; FE за флагом `VITE_CASHBOX_DELETE` |
| 2026-09-11 | nur-market (FE/docs) | Добавлено наследование отчёта (`merge_into`, §7), массовое удаление (`bulk-delete/`, §8), тест-кейсы 14–23, вопросы D6–D9; расширен скоуп удаления на дубли `pos_main` |
