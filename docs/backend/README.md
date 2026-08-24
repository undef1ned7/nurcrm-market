# Документация для бэкенда NurCRM Market

Контракты API, которые нужны **NurCRM API** (репозиторий бэкенда отдельно). Фронт: этот репозиторий `nur-market`.

Базовый префикс: `{host}/api` + пути `/main/...`, `/warehouse/...`, `/users/...`.  
**Не вводить `/api/v1/`**, пока фронт явно не мигрирует.

Авторизация: `Authorization: Bearer <accessToken>`. Таймзона бизнеса: **Asia/Bishkek, UTC+6**.

ТЗ фронта и perf остаются в `docs/market/`.

| Файл | Тема | Статус для BE |
|------|------|----------------|
| [tz-aug-2026-backend.md](./tz-aug-2026-backend.md) | ТЗ авг 2026: массовый приход, уведомления, F3, 18+ | частично нужен |
| [procurement-history-returns-backend.md](./procurement-history-returns-backend.md) | История закупок + возврат поставщикам | возвраты — новый API |
| [procurement-recommendations-backend.md](./procurement-recommendations-backend.md) | Рекомендуемый заказ поставщика | новый GET |
| [product-form-layout-backend.md](./product-form-layout-backend.md) | Раскладка формы товара (`hidden[]`) | новый singleton |
| [shift-payment-breakdown-backend.md](./shift-payment-breakdown-backend.md) | Закрытие смены: `payment_breakdown` | поле в close-shift |
| [debt-installment-schedule-backend.md](./debt-installment-schedule-backend.md) | Продажа в долг: бэк default v1 / фронт маркета v2 | `debt_schedule_version` + deals v2 |
| [client-kpis-backend.md](./client-kpis-backend.md) | KPI карточки клиента: долг / аванс / продажи | новый GET |
| [adult-products-backend.md](./adult-products-backend.md) | Товар 18+: `is_adult` | поле на Product |
| [cashier-settings.md](./cashier-settings.md) | Код удаления из корзины + max скидка | GET/PATCH/verify |
| [alternate-barcodes.md](./alternate-barcodes.md) | Доп. штрихкоды в scan/lookup | правки поиска |
| [analytics.md](./analytics.md) | Аналитика: datetime + таймзона | правка фильтра |
| [bulk_update_products.md](./bulk_update_products.md) | Массовая смена brand/category/supplier | новый PATCH |
| [receipt-price-edit-discount.md](./receipt-price-edit-discount.md) | Ручная цена ≠ discount в чеке | правка JSON чека |
| [receipt-price-override-flag.md](./receipt-price-override-flag.md) | Флаг ручной цены на позиции чека | новое поле items[] |
| [receipt-ekassa-item-matching.md](./receipt-ekassa-item-matching.md) | Стабильный id для merge eKassa 1059 ↔ items | item_id в обоих местах |
| [pos-printer-config-sync.md](./pos-printer-config-sync.md) | Синк escpos_* на бэк (per-device) | low-priority |
| [supplier-receipt-selling-price-backend.md](./supplier-receipt-selling-price-backend.md) | Приход: пересчёт `price` по `markup_percent` | правка POST receipt |
| [scales-weight-products.md](./scales-weight-products.md) | Фильтр весовых `?is_weight=true` | сделано |

Если фронт уже ходит в path из документа — не менять URL без сообщения фронту: парсер обычно в одном файле `*Api.ts`.
