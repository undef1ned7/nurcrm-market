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
| [auth-and-api-basics.md](./auth-and-api-basics.md) | **Начните отсюда:** базовые URL/окружения, авторизация, права, WS-подключение, ошибки, идемпотентность |
| [realtime-notifications.md](./realtime-notifications.md) | Полный каталог WS-событий `market.*`, REST-уведомления, дедуп |
| [products-catalog.md](./products-catalog.md) | Список товаров, фильтры склада, штрихкоды, весы |
| [products-search-and-bulk.md](./products-search-and-bulk.md) | Поиск продаж по штрихкоду, alternate barcodes, массовое редактирование товаров (частично не реализовано на бэке) |
| [product-expiry.md](./product-expiry.md) | Сроки годности: простая модель (готово) + партионная FEFO (только ТЗ) |
| [analytics.md](./analytics.md) | Аналитика/отчёты по вкладкам, известные баги фильтрации по времени |
| [add-product.md](./add-product.md) | Создание / редактирование товара |
| [mass-scan.md](./mass-scan.md) | **Массовое сканирование на склад:** классификация, цена для товаров из базы NurCRM, создание карточек, приход без склада |
| [adult-products.md](./adult-products.md) | Товар 18+: флаг, касса, второй экран |
| [cashier-settings.md](./cashier-settings.md) | Код удаления из корзины + max скидка |
| [cash-and-cashflows.md](./cash-and-cashflows.md) | **Денежные средства:** auto-cashflows на бэке (BE готов), смены, pending |
| [cashbox-reports.md](./cashbox-reports.md) | **Отчёты кассы:** день/месяц, аналитика, fallback |
| [cashbox-admin.md](./cashbox-admin.md) | Роль кассы `debt` (заблокировано), удаление/merge касс (только ТЗ), баг дублей `pos_main` |
| [sale-returns-and-cashflow-requests.md](./sale-returns-and-cashflow-requests.md) | Возврат чека (компенсирующий расход, риск pending) + запросы на правку/отмену записи кассы |
| [client-debt-and-kpis.md](./client-debt-and-kpis.md) | Карточка клиента: KPI + долг + оплата графика |
| [debt-installment-schedule.md](./debt-installment-schedule.md) | Продажа в долг: v1 и v2 |
| [debt-payments.md](./debt-payments.md) | Оплатить весь долг, способ оплаты, риск бага v2-графика — проверить перед релизом |
| [procurement-history-returns.md](./procurement-history-returns.md) | История закупок + возврат поставщикам |
| [procurement-recommendations.md](./procurement-recommendations.md) | Рекомендуемый заказ |
| [procurement-and-finance-extras.md](./procurement-and-finance-extras.md) | Быстрый ресток, цена продажи при приёмке, разбивка прочих расходов |
| [product-form-layout.md](./product-form-layout.md) | Раскладка формы товара |
| [receipt-price-edit-discount.md](./receipt-price-edit-discount.md) | Ручная цена ≠ скидка в чеке |
| [receipts-and-fiscal.md](./receipts-and-fiscal.md) | Сопоставление позиций с ekassa, флаг ручной цены, весовые товары в чеке |
| [printer-and-subscription.md](./printer-and-subscription.md) | Синхронизация настроек принтера (черновик) + экран подписки/аккаунта (ТЗ) |
| [tz-aug-2026.md](./tz-aug-2026.md) | ТЗ авг 2026: уведомления, F3, 18+ (mass-scan — см. [mass-scan.md](./mass-scan.md)) |

Если API ещё нет (`404`/`405`/`501`) — смотрите раздел fallback в каждом файле: веб уже так работает.
