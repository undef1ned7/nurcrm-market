# Документация для бэкенда NurCRM Market

Контракты API, которые нужны **NurCRM API** (репозиторий бэкенда отдельно). Фронт: этот репозиторий `nur-market`.

Базовый префикс: `{host}/api` + пути `/main/...`, `/warehouse/...`, `/users/...`.  
**Не вводить `/api/v1/`**, пока фронт явно не мигрирует.

Авторизация: `Authorization: Bearer <accessToken>`. Таймзона бизнеса: **Asia/Bishkek, UTC+6**.

ТЗ фронта и perf остаются в `docs/market/`.

---

## Касса (деньги, смены, закупки)

**Вся кассовая документация собрана в одной папке:**

### → [`kassa/README.md`](./kassa/README.md)

| Файл | Тема |
|------|------|
| [kassa/SCENARIO-POST-MIGRATION.md](./kassa/SCENARIO-POST-MIGRATION.md) | **Сценарий, риски, недостатки, выкат** |
| [kassa/auto-cashflows-backend.md](./kassa/auto-cashflows-backend.md) | Auto income/expense + маршрутизация касс |
| [kassa/BACKEND-IMPLEMENTATION.md](./kassa/BACKEND-IMPLEMENTATION.md) | **Python: resolve_cashbox, expected_cash, Django tests** |
| [kassa/shift-cash-reconciliation-backend.md](./kassa/shift-cash-reconciliation-backend.md) | Сверка смены (`expected_cash`) |
| [kassa/shift-payment-breakdown-backend.md](./kassa/shift-payment-breakdown-backend.md) | `payment_breakdown` при закрытии |
| [kassa/QA-CLIENT-CHECKLIST.md](./kassa/QA-CLIENT-CHECKLIST.md) | QA: клиентский прогон на staging |
| [kassa/debt-installment-schedule-backend.md](./kassa/debt-installment-schedule-backend.md) | Долг v1/v2, график платежей — контракт API |
| [kassa/debt-v2-backend-implementation.md](./kassa/debt-v2-backend-implementation.md) | **Долг v2 — implementation guide, баг stage, тесты** |
| [kassa/debt-payment-method-backend.md](./kassa/debt-payment-method-backend.md) | Погашение долга: способ оплаты (наличные / перевод + банк), поле `payment_method` |
| [kassa/procurement-history-returns-backend.md](./kassa/procurement-history-returns-backend.md) | Закупки + возврат поставщику |
| [kassa/supplier-receipt-selling-price-backend.md](./kassa/supplier-receipt-selling-price-backend.md) | Приход: цена по наценке |
| [kassa/realtime-notifications-backend.md](./kassa/realtime-notifications-backend.md) | WS + `market.*` события |
| [kassa/cashier-settings.md](./kassa/cashier-settings.md) | Настройки кассира |
| [kassa/finance-other-expenses-breakdown-backend.md](./kassa/finance-other-expenses-breakdown-backend.md) | Аналитика «Финансы»: детальная разбивка статьи «Прочее» (`category` в `expense_items[]`) |

---

## Прочие контракты

| Файл | Тема | Статус для BE |
|------|------|----------------|
| [product-expiry-tracking-backend.md](./product-expiry-tracking-backend.md) | Срок годности товара: `expiration_date`, аналитика «Товары», уведомление `market.product.expiring` | новое поле + новый GET + cron |
| [product-batch-expiry-backend.md](./product-batch-expiry-backend.md) | Срок годности по партиям прихода (FEFO) — закрывает §7 предыдущего документа: `shelf_life_days` на товаре + модель `ProductExpiryBatch`, своя дата у каждой партии | новая модель + 2 сервис-функции + новый GET |
| [tz-aug-2026-backend.md](./tz-aug-2026-backend.md) | ТЗ авг 2026: массовый приход, уведомления, F3, 18+ | частично нужен |
| [procurement-recommendations-backend.md](./procurement-recommendations-backend.md) | Рекомендуемый заказ поставщика | новый GET |
| [product-form-layout-backend.md](./product-form-layout-backend.md) | Раскладка формы товара (`hidden[]`) | новый singleton |
| [client-kpis-backend.md](./client-kpis-backend.md) | KPI карточки клиента: долг / аванс / продажи | новый GET |
| [adult-products-backend.md](./adult-products-backend.md) | Товар 18+: `is_adult` | поле на Product |
| [subscription-account-panel-backend.md](./subscription-account-panel-backend.md) | Панель «Подписка и аккаунт»: `created_at`, `subscription{days_left,status,plan}` | `created_at` + subscription-объект |
| [warehouse-filters-backend.md](./warehouse-filters-backend.md) | Фильтры склада `/crm/sklad`: подтвердить работу по всем полям | вопросы BE |
| [alternate-barcodes.md](./alternate-barcodes.md) | Доп. штрихкоды в scan/lookup | правки поиска |
| [analytics.md](./analytics.md) | Аналитика: datetime + таймзона | правка фильтра |
| [bulk_update_products.md](./bulk_update_products.md) | Массовая смена brand/category/supplier | новый PATCH |
| [receipt-price-edit-discount.md](./receipt-price-edit-discount.md) | Ручная цена ≠ discount в чеке | правка JSON чека |
| [receipt-price-override-flag.md](./receipt-price-override-flag.md) | Флаг ручной цены на позиции чека | новое поле items[] |
| [receipt-ekassa-item-matching.md](./receipt-ekassa-item-matching.md) | Стабильный id для merge eKassa 1059 ↔ items | item_id в обоих местах |
| [pos-printer-config-sync.md](./pos-printer-config-sync.md) | Синк escpos_* на бэк (per-device) | low-priority |
| [scales-weight-products.md](./scales-weight-products.md) | Весы и PLU: API (`is_weight`, export, scan, company settings) | сделано |
| [../market/scales-and-plu.md](../market/scales-and-plu.md) | **Полная документация** весов и PLU (фронт + сценарии) | — |

Если фронт уже ходит в path из документа — не менять URL без сообщения фронту: парсер обычно в одном файле `*Api.ts`.
