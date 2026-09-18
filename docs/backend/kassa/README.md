# Касса (kassa) — документация для бэкенда

Контракты API NurCRM для **денежных операций**, **смен**, **кассового учёта**, **закупок**.

**Фронт:** `nur-market` (готов) · **Бэкенд:** NurCRM API (**реализовано, staging готов** — см. [BACKEND-QUESTIONS.md](./BACKEND-QUESTIONS.md))  
Префикс: `{host}/api` · TZ: **Asia/Bishkek (UTC+6)**

---

## Handoff для бэкенда

| | |
|---|---|
| **🔴 Баг на проде** | 4 активные кассы `role=pos_main` на одной компании — см. [pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md) |
| **Новое (11.09)** | Удаление кассы + наследование отчёта ([cashbox-delete-backend.md](./cashbox-delete-backend.md)); роль «Для долгов» ([cashbox-debt-role-backend.md](./cashbox-debt-role-backend.md)) — FE готов за флагами, ждём BE |
| **Новое (16.09)** | Выключатель «Запросы на подтверждение» ([cashflow-requests-toggle-backend.md](./cashflow-requests-toggle-backend.md)), default **выключено** — FE готов (мягкая деградация), нужно поле в `MarketCashierSettings` + ответы Q1–Q5 |
| **P0 (блокирует prod)** | `Cashbox.role`, `resolve_cashbox()`, atomic auto-cashflows, `expected_cash = drawer_expected_cash`, reject cascade |
| **P1** | `payment_breakdown`, `non_drawer_expenses_total`, `affects_shift_drawer` |
| **Phase 2** | `shift_drawer_outflow`, transfer POS → expense |
| **Синхронный выкат** | `AUTO_CASHFLOWS=true` (BE) + `VITE_BE_CASHFLOWS=true` (FE) **в один день** |
| **Референс-кейс QA** | opening **50**, cash sales **33 768**, закупки **54 625**, closing **8 888** → `expected_cash=33818`, `cash_diff=-24930` |
| **FE репо** | `nur-market` — маршрутизация через `cashbox_role` / `branch_id` / `shift_id`, без `cashBoxes[0]` |

**Порядок чтения:** SCENARIO → auto-cashflows → BACKEND-IMPLEMENTATION → shift-* → [QA-CLIENT-CHECKLIST](./QA-CLIENT-CHECKLIST.md)

---

## С чего начать

| # | Документ | Зачем |
|---|----------|--------|
| 0 | **[SCENARIO-POST-MIGRATION.md](./SCENARIO-POST-MIGRATION.md)** | **Полный сценарий, риски, пробелы, чек-лист выката** |
| 1 | [auto-cashflows-backend.md](./auto-cashflows-backend.md) | Главное ТЗ: API + маршрутизация касс |
| 2 | [BACKEND-IMPLEMENTATION.md](./BACKEND-IMPLEMENTATION.md) | **Python: resolve_cashbox, expected_cash, tests** |
| 3 | [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md) | expected_cash без закупок в смене |
| 4 | [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md) | Разбивка оплат при закрытии |
| 5 | [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md) | **Клиентский прогон на staging** |
| 6 | [BACKEND-QUESTIONS.md](./BACKEND-QUESTIONS.md) | **Вопросы к BE после отчёта о реализации** |
| 7 | [notifications-backend-implementation.md](./notifications-backend-implementation.md) | **Уведомления Market/POS — полное ТЗ для BE** |
| 8 | [cashbox-reports-backend.md](./cashbox-reports-backend.md) | **Отчёты кассы (дневной/месячный/аналитика)** |
| 9 | [sale-return-cashflow-backend.md](./sale-return-cashflow-backend.md) | **Возврат чека → компенсирующее движение по кассе (баг: приход не уходит)** |
| 10 | [OPEN-QUESTIONS-2026-09.md](./OPEN-QUESTIONS-2026-09.md) | Открытые вопросы (сент. 2026) → [ответ BE получен](./OPEN-QUESTIONS-2026-09-BE-RESPONSE.md), выкат 2026-09-10 |

---

## Индекс

| Файл | Тема |
|------|------|
| [OPEN-QUESTIONS-2026-09.md](./OPEN-QUESTIONS-2026-09.md) | Открытые вопросы/пробелы (сент. 2026): возврат чека, заявки на правку движения, настройки кассы, бэкфилл, Phase 2, синхронный выкат |
| [OPEN-QUESTIONS-2026-09-BE-RESPONSE.md](./OPEN-QUESTIONS-2026-09-BE-RESPONSE.md) | Ответ BE на вопросы выше + разбор FE (A1–A8 к доработке), окно выката 2026-09-10 04:00–06:00 UTC+6 |
| [RELEASE-2026-09-10.md](./RELEASE-2026-09-10.md) | Чек-лист синхронного выката (A1–A8): что сделано в коде, что в окне релиза, что на согласование |
| [SCENARIO-POST-MIGRATION.md](./SCENARIO-POST-MIGRATION.md) | Сценарий после изменений, риски, недостатки |
| [auto-cashflows-backend.md](./auto-cashflows-backend.md) | Auto cashflows + routing |
| [BACKEND-IMPLEMENTATION.md](./BACKEND-IMPLEMENTATION.md) | Implementation guide + Django tests |
| [shift-cash-reconciliation-backend.md](./shift-cash-reconciliation-backend.md) | Сверка ящика |
| [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md) | payment_breakdown |
| [shift-sale-positions-backend.md](./shift-sale-positions-backend.md) | Позиции чека по клику на продажу в списке смены — фронт работает на существующем `GET /main/pos/sales/{id}/`, нужно подтвердить совместимость id и (опционально) добавить `items` сразу в список |
| [QA-CLIENT-CHECKLIST.md](./QA-CLIENT-CHECKLIST.md) | QA: клиентские сценарии на staging |
| [BACKEND-QUESTIONS.md](./BACKEND-QUESTIONS.md) | Вопросы к бэкенду (post-implementation) |
| [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md) | Долг v1/v2 — контракт API |
| [debt-v2-backend-implementation.md](./debt-v2-backend-implementation.md) | **Долг v2 — implementation guide + баг stage** |
| [debt-pay-all-backend.md](./debt-pay-all-backend.md) | «Оплатить весь долг» одной кнопкой — фронт работает циклом, предложен bulk-эндпоинт `pay-all/` |
| [debt-pay-arbitrary-amount-backend.md](./debt-pay-arbitrary-amount-backend.md) | Оплата произвольной суммы по нескольким долгам клиента сразу (KPI «Долг») — фронт работает циклом с FIFO-распределением, предложен bulk-эндпоинт `deals/pay-any/` |
| [debt-payment-method-backend.md](./debt-payment-method-backend.md) | Погашение долга (v1 `/main/debts/` + v2 `deals/.../pay/`): способ оплаты наличные / перевод + банк — новое поле `payment_method`, маршрутизация прихода |
| [procurement-history-returns-backend.md](./procurement-history-returns-backend.md) | Закупки + возвраты |
| [supplier-receipt-selling-price-backend.md](./supplier-receipt-selling-price-backend.md) | Приход: цена по наценке |
| [quick-restock-purchase-batch-backend.md](./quick-restock-purchase-batch-backend.md) | «Добавление товара» на карточке склада не попадало в «Историю закупок» — фикс + вопросы |
| [notifications-backend-implementation.md](./notifications-backend-implementation.md) | **Уведомления — implementation guide (BE)** |
| [realtime-notifications-backend.md](./realtime-notifications-backend.md) | WS market.* — контракт FE |
| [cashier-settings.md](./cashier-settings.md) | Настройки кассира |
| [cashbox-reports-backend.md](./cashbox-reports-backend.md) | Отчёты кассы (BE API) |
| [sale-return-cashflow-backend.md](./sale-return-cashflow-backend.md) | Возврат POS-чека: компенсирующий expense, идемпотентность, split/долг |
| [cashflow-edit-cancel-request-backend.md](./cashflow-edit-cancel-request-backend.md) | Редактирование/отмена движения кассы через заявку на конкретную кассу |
| [cashflow-requests-toggle-backend.md](./cashflow-requests-toggle-backend.md) | **Новое** — выключатель «Запросы на подтверждение» (владелец/админ, любая сфера), default **выключено**: отключает pending для ручных записей, компенсации возврата и правки/отмены движения разом |
| [cashbox-delete-backend.md](./cashbox-delete-backend.md) | Удаление кассы: `DELETE /construction/cashboxes/{id}/` — мягкий архив, **наследование отчёта** (`merge_into`), массовое удаление (`bulk-delete/`), гарды (открытая смена, последняя роль-критичная касса, pending) |
| [cashbox-debt-role-backend.md](./cashbox-debt-role-backend.md) | Новая роль кассы `debt` («Для долгов»): чекбокс при создании, назначение существующей кассе, маршрутизация `debt_repayment`/`supplier_debt_payment`, критично — влияние на `drawer_expected_cash` |
| [pos-main-duplicate-role-bug.md](./pos-main-duplicate-role-bug.md) | **Баг:** на компании обнаружено 4 активные кассы с ролью `pos_main` — `is_consumption` не влияет на роль, keyword-fallback по умолчанию даёт `pos_main`. Подтверждено реальным ответом API |
| [debt-source-receipt-backend.md](./debt-source-receipt-backend.md) | Долг клиента → связь с чеком, из которого создан: нужно поле `sale_id` в `Deal`. Фронт готов, ждёт бэк |
| [finance-other-expenses-breakdown-backend.md](./finance-other-expenses-breakdown-backend.md) | Аналитика «Финансы»: детальная таблица + KPI по статье «Прочее» — нужно поле `category` в `expense_items[]` |
| [sales-search-by-barcode-backend.md](./sales-search-by-barcode-backend.md) | Раздел «Продажи»: поиск всех чеков по штрих-коду товара — новый параметр `barcode` на `GET /main/pos/sales/` |

Остальной бэкенд: [`../README.md`](../README.md).
