# Аналитика маркета, вкладка «Продажи»: как считается сейчас

**Для кого:** разработчик или аналитик, который проверяет расчёты.
**Эндпоинт:** `GET /main/analytics/market/?tab=sales`
**Код на проде:** `/home/nur/apps/main/analytics_market.py`, класс `AnalyticsView`, метод `_sales` (строки 857–1143), хелперы вверху файла.
**Состояние на:** 2026-10-03. Описано то, что код делает **сейчас**, включая ошибки. Что нужно исправить, написано в [analytics-market-sales-fixes-backend.md](analytics-market-sales-fixes-backend.md).

---

## 1. Параметры запроса

| Параметр | Что делает |
|---|---|
| `tab=sales` | вкладка «Продажи» |
| `period_start`, `period_end` | период, `YYYY-MM-DDTHH:MM:SS` (местное время, Asia/Bishkek) или `YYYY-MM-DD`. Старые имена: `date_from`, `date_to` |
| `cashbox` | `Sale.cashbox_id = <uuid>` |
| `shift` | `Sale.shift_id = <uuid>` |
| `cashier` | `Sale.user_id = <uuid>` (если нет поля `user`, то `shift.cashier_id`) |
| `consultant` | `Sale.consultant_id` |
| `payment_method` | `Sale.payment_method` |
| `min_total`, `max_total` | `Sale.total >= / <=` |
| `branch`, `include_global=1` | филиал; с `include_global` берутся и записи без филиала |

Компания берётся из пользователя (`_get_company(request.user)`). Все выборки ограничены `company=<компания пользователя>`.

## 2. Период

`_get_period` превращает период в пару `[start, end)`: начало включительно, конец исключительно.

- Время трактуется как местное время проекта. Таймзона во входе отбрасывается.
- `period_end` только датой (`2026-10-31`): `end = 00:00 следующего дня`.
- `period_end` со временем (`2026-10-31T23:59:59`): `end = это время + 1 секунда`.
- Невалидное значение даёт HTTP 400.
- Если не задана ни одна граница или только одна, берётся текущий календарный месяц.

Пример: `period_start=2026-10-01T00:00:00&period_end=2026-10-31T23:59:59` даёт `start=2026-10-01T00:00+06:00`, `end=2026-11-01T00:00+06:00`. Это совпадает с полем `period` в ответе.

**Скрытая подстановка периода (потенциальная ошибка).** Если `start` раньше первого дня текущего месяца и в этом периоде нет ни одной оплаченной продажи (`status=paid`, без учёта `cashbox` и других фильтров), а в текущем месяце продажи есть, бэк **молча подменяет период на текущий месяц**. Поле `period` в ответе при этом покажет подменённые даты. Для запроса за прошлый месяц без продаж пользователь получит данные текущего месяца.

## 3. Какие продажи входят

Модель `Sale` (таблица продаж POS), фильтры по порядку:

1. `company = компания пользователя`.
2. Филиал: если задан, то `branch = филиал` (с `include_global`: `branch = филиал OR branch IS NULL`).
3. **Статус:** `status IN ('paid', 'partially_returned')`. Статусы `canceled` (полный возврат), `debt` и прочие в выручку не входят.
4. **Дата:** поле `paid_at`, если оно есть в модели, иначе `created_at`. Условие `paid_at >= start AND paid_at < end`. Запись с `paid_at IS NULL` в выборку не попадает (так выпадают продажи в долг).
5. Пользовательские фильтры: `cashbox`, `shift`, `cashier`, `consultant`, `payment_method`, `min_total`, `max_total` (раздел 1).

Получившийся набор обозначим `S`. Все карточки, графики и таблицы ниже считаются по нему, кроме возвратов (раздел 5).

## 4. Карточки по набору S

| Поле | Формула |
|---|---|
| `revenue` | `SUM(Sale.total)` по `S` |
| `transactions` | `COUNT(Sale.id)` по `S` |
| `avg_check` | `revenue / transactions`, 0 при нуле транзакций, округление до копеек |
| `clients` | число различных `Sale.client_id` по `S`, без NULL (если нет поля `client`, то по `user_id`) |
| `cogs` | `SUM(SaleItem.quantity × unit_cost)` по строкам чеков из `S` (ниже) |
| `gross_profit` | `revenue − cogs` |
| `margin_percent` | `gross_profit / revenue × 100`, один знак после запятой; `null`, если `revenue <= 0` |
| `cogs_warning` | текст, если `revenue > 0` и `cogs == 0`: «Себестоимость не заполнена…» |
| `catalog_products_count` | число товаров компании (филиал как выше) |
| `total_stock_quantity` | `SUM(Product.quantity)` по каталогу компании |

`Sale.total` хранится **после** скидок и **после** частичных возвратов: при частичном возврате бэк уменьшает `total` чека.

**Себестоимость строки (`unit_cost`).** Первое, что найдётся в `SaleItem`:
1. `COALESCE(purchase_price_snapshot, product.purchase_price, 0)`;
2. иначе поле `unit_cost` / `cost_price` / `purchase_price` / `buy_price`;
3. иначе `product.purchase_price`.

Количество берётся из `SaleItem.quantity`. Нужно проверить, уменьшается ли оно при частичном возврате: если нет, себестоимость возвращённого товара остаётся в `cogs`.

## 5. Возвраты

Блок завёрнут в `try/except` и при любой ошибке молча остаётся с нулями.

```
SaleReturn.objects.filter(
    company = компания,
    created_at >= start, created_at < end,              # дата самого возврата
    [если задан branch] sale.branch = branch (или NULL с include_global),
)
returns_count = COUNT(id)
returns_total = SUM(returned_amount)
```

Фильтры `cashbox`, `shift`, `cashier`, `consultant`, `payment_method`, `min_total`, `max_total` на возвраты **не действуют**.

## 6. Итоговые поля, как они сейчас заполняются

```
revenue                 = SUM(Sale.total) по S                 # уже уменьшен на возвраты
gross_revenue           = revenue                              # то же самое число
revenue_before_returns  = revenue                              # то же самое число
returns_total           = SUM(SaleReturn.returned_amount)
returns_count           = COUNT(SaleReturn)
net_revenue             = revenue − returns_total              # вычитание второй раз
```

Все три поля («выручка», «gross», «до возвратов») возвращают одно и то же число. Это ошибка: «до возвратов» должно быть больше.

Фронт выводит на карточках: «Выручка» = `revenue`, «Возвраты» = `returns_total` и `returns_count`, «Чистая выручка» = `net_revenue`.

## 7. Графики и таблицы

| Что | Как считается |
|---|---|
| `charts.sales_dynamics` | группировка `S` по `TruncDate(paid_at)`: `{date, SUM(total)}`. Дата берётся в таймзоне проекта |
| `charts.payment_methods` | группировка `S` по `payment_method`: `{method, count, total}`. Для `mixed` добавлены `cash` и `card` из строк `SalePayment` (все платежи, кроме `mixed`; `cash` идёт в наличные, остальное в безнал) |
| `tables.top_products` | строки чеков из `S`, группировка по `product_id` + `name_snapshot`: `sold = SUM(quantity)`, `revenue = SUM(quantity × unit_price − line_discount)`; топ-5 по выручке. Скидка на уровне всего чека (`discount_total`) сюда **не** вычитается |
| `tables.documents` | четыре строки: «Продажа» (`transactions`, `revenue`), «Закупка» (0), «Возврат продажи» (`returns_count`, `returns_total`), «Возврат закупки» (0) |
| `tables.products_stock` | список товаров компании с остатками (не зависит от периода и кассы) |

## 8. Пример: компания INOX, октябрь 2026

Данные из базы (время местное):

| № | Создан | Статус | Способ | `total` сейчас | `paid_at` | Возврат |
|---|---|---|---|---|---|---|
| 1 | 02.10 21:18 | partially_returned | cash | 400 | 02.10 21:18 | 2200 (03.10 00:24) |
| 2 | 02.10 21:21 | paid | mbank | 165 000 | 02.10 21:21 | нет |
| 3 | 02.10 21:22 | paid | debt | 15 000 | **пусто** | нет |
| 4 | 02.10 21:23 | partially_returned | mixed | 27 000 | 02.10 21:23 | 13 500 (03.10 00:24) |

Исходные суммы до возвратов: чек №1 = 400 + 2200 = 2600, чек №4 = 27 000 + 13 500 = 40 500.

**Что считает код сейчас** (период октябрь, касса `2c13d535…`, своя касса компании):

| Поле | Расчёт | Значение |
|---|---|---|
| `S` | чеки №1, №2, №4 (№3 выпадает: `paid_at` пустой) | 3 чека |
| `revenue` | 400 + 165 000 + 27 000 | 192 400 |
| `transactions` | | 3 |
| `avg_check` | 192 400 / 3 | 64 133,33 |
| `returns_total` | 2200 + 13 500 | 15 700 |
| `net_revenue` | 192 400 − 15 700 | **176 700** |

**Ожидаемо по владельцу:** «Выручка» 208 100 (2600 + 165 000 + 40 500), «Возвраты» 15 700, «Чистая выручка» 192 400. Чек №3 (долг, 15 000) владелец в 208 100 не включал, это нужно подтвердить отдельно.

**Проверка в базе** (только SELECT):

```sql
-- набор S
SELECT count(*), sum(total) FROM main_sale
WHERE company_id = 'b6491622-01fc-423c-9663-6e2834064bcf'
  AND status IN ('paid','partially_returned')
  AND paid_at >= '2026-10-01 00:00+06' AND paid_at < '2026-11-01 00:00+06'
  AND cashbox_id = '2c13d535-2d68-4d90-a731-b610d1e72938';
-- ожидается 3 / 192400.00

-- возвраты
SELECT count(*), sum(returned_amount) FROM main_salereturn
WHERE company_id = 'b6491622-01fc-423c-9663-6e2834064bcf'
  AND created_at >= '2026-10-01 00:00+06' AND created_at < '2026-11-01 00:00+06';
-- ожидается 2 / 15700.00

-- сумма до возвратов
SELECT sum(s.total) + coalesce(sum(r.returned_amount), 0)
FROM main_sale s LEFT JOIN main_salereturn r ON r.sale_id = s.id
WHERE s.company_id = 'b6491622-01fc-423c-9663-6e2834064bcf'
  AND s.status IN ('paid','partially_returned')
  AND s.paid_at >= '2026-10-01 00:00+06' AND s.paid_at < '2026-11-01 00:00+06';
-- ожидается 208100.00
```

Имена таблиц могут отличаться (`main_sale`, `main_salereturn`); проверять по `Model._meta.db_table`.

## 9. Кэш

Ответ кэшируется на `CACHE_TIMEOUT_ANALYTICS` секунд (по умолчанию 300). Ключ: компания, филиал, вкладка и md5 всех query-параметров. Сброса кэша при новой продаже или возврате нет: новые данные могут появиться с задержкой до 5 минут. При проверке после правок нужно либо подождать, либо менять параметры запроса (например, добавить `&_=1`).

## 10. Сводка проблем

| # | Проблема | Где | Следствие |
|---|---|---|---|
| 1 | Не проверяется принадлежность `cashbox` компании | `_apply_sale_filters`, `:597` | чужая касса даёт нули без ошибки |
| 2 | Возвраты не фильтруются по кассе, смене, кассиру | `_sales`, `:1076` | возвраты видны при нулевых продажах |
| 3 | `revenue` уже без возвратов, `net_revenue` вычитает их второй раз | `:952`, `:1118-1123` | чистая выручка занижена на сумму возвратов |
| 4 | Продажи в долг (`paid_at IS NULL`) не попадают в период | `:940-941` | долговые продажи нигде не видны |
| 5 | Молчаливая подмена периода на текущий месяц | `_get_period` | пустой прошлый месяц показывает данные текущего |
| 6 | `try/except` вокруг возвратов проглатывает любую ошибку | `:1096` | возможны тихие нули |
| 7 | Скидка на весь чек не учитывается в `top_products` | `:1030` | сумма топа не совпадает с выручкой |
| 8 | Не проверено, уменьшается ли `SaleItem.quantity` при возврате | `cogs` | возможна завышенная себестоимость |
| 9 | Нет сброса кэша при новых продажах и возвратах | `get`, `:748` | задержка до 5 минут |

Пункты 1–4 разобраны подробно в [analytics-market-sales-fixes-backend.md](analytics-market-sales-fixes-backend.md). Пункты 5–9 я нашёл при чтении кода и данными на проде не проверял.
