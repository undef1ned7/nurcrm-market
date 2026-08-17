# Документация для Flutter (NurCRM Market)

Контракты и поведение экранов, как на веб-фронте `nur-market`. Цель — повторить API, валидацию и UX 1:1 на мобильном клиенте.

Базовый префикс: `{host}/api` + пути `/main/...`, `/warehouse/...`, `/users/...`.  
**Не использовать `/api/v1/`**, пока веб явно не мигрирует.

Авторизация: `Authorization: Bearer <accessToken>`.  
Таймзона бизнеса: **Asia/Bishkek, UTC+6**.  
Валюта в UI: COM (сом).  
i18n (те же ключи, что веб): [`../i18n.md`](../i18n.md).

Бэкенд-контракты: [`../backend/README.md`](../backend/README.md).

| Файл | Тема |
|------|------|
| [add-product.md](./add-product.md) | Создание / редактирование товара |
| [adult-products.md](./adult-products.md) | Товар 18+: флаг, касса, второй экран |
| [cashier-settings.md](./cashier-settings.md) | Код удаления из корзины + max скидка |
| [client-debt-and-kpis.md](./client-debt-and-kpis.md) | Карточка клиента: KPI + долг + оплата графика |
| [debt-installment-schedule.md](./debt-installment-schedule.md) | Продажа в долг: v1 и v2 |
| [procurement-history-returns.md](./procurement-history-returns.md) | История закупок + возврат поставщикам |
| [procurement-recommendations.md](./procurement-recommendations.md) | Рекомендуемый заказ |
| [product-form-layout.md](./product-form-layout.md) | Раскладка формы товара |
| [receipt-price-edit-discount.md](./receipt-price-edit-discount.md) | Ручная цена ≠ скидка в чеке |
| [tz-aug-2026.md](./tz-aug-2026.md) | ТЗ авг 2026: mass-scan, уведомления, F3, 18+ |

Если API ещё нет (`404`/`405`/`501`) — смотрите раздел fallback в каждом файле: веб уже так работает.
