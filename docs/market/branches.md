# Филиалы: frontend-документация

Функция «Филиалы» управляет точками продаж компании, показывает данные выбранного филиала в связанных разделах и поддерживает перемещение товаров между главным складом и филиалами.

Код функции:

- страницы: `src/pages/branches/`;
- entity/API/state: `src/entities/branch/`;
- маршруты: `src/app/router/routes/commonRoutes.tsx`;
- подстановка текущего филиала в GET-запросы: `src/shared/lib/tools/branchContext.ts`, `src/shared/api/base.ts`;
- backend-контракт перемещений: `docs/backend/branch-transfers-backend.md`.

## 1. Маршруты

| Маршрут | Экран | Назначение |
|---|---|---|
| `/crm/branch` | `Branch` | список филиалов, поиск, создание, редактирование, активация, удаление |
| `/crm/branch/:id` | `BranchDetails` | карточка филиала с вкладками кассы, склада, продаж, аналитики, сотрудников, клиентов и перемещений |
| `/crm/branch/transfers` | `BranchTransfers` | история товарных перемещений между главным складом и филиалами |
| `/crm/branch/transfers/new` | `TransferCreatePage` | создание и проведение перемещения |

Поддерживаемые query-параметры:

- `/crm/branch/:id?tab=<tabId>` — активная вкладка карточки филиала.
- `/crm/branch/transfers?branch=<id>&dir=in|out&open=<transferId>` — история конкретного филиала, направление и открытая боковая карточка.
- `/crm/branch/transfers/new?from=<id>&to=<id>` — предзаполненный маршрут перемещения.
- `/crm/branch/transfers/new?repeat=<transferId>` — повтор перемещения с копированием маршрута и позиций.

## 2. Entity `@entities/branch`

Public API экспортируется из `src/entities/branch/index.ts`.

Redux slice хранится в `state.branches`:

| Поле | Значение |
|---|---|
| `list` | массив филиалов |
| `loading/error` | загрузка списка |
| `creating/createError` | создание |
| `updating/updateError` | редактирование |
| `deleting/deleteError` | удаление |
| `toggling/toggleError` | переключение `is_active` |

CRUD thunks:

| Thunk | HTTP | Описание |
|---|---|---|
| `fetchBranchesAsync(params)` | `GET /users/branches/` | список, поддерживает пагинированный и простой массив |
| `createBranchAsync(data)` | `POST /users/branches/` | создание филиала |
| `updateBranchAsync({ branchId, updatedData })` | `PATCH /users/branches/{id}/` | частичное обновление |
| `deleteBranchAsync(branchId)` | `DELETE /users/branches/{id}/` | удаление |
| `toggleBranchActiveAsync({ branchId, isActive })` | `PATCH /users/branches/{id}/` | обновление `is_active` |

Вспомогательный API перед удалением:

- `fetchBranchUsage(branchId)` параллельно проверяет открытые смены, товары, сотрудников и перемещения.
- `describeBranchUsage(usage)` собирает человекочитаемое предупреждение.
- Если в филиале есть открытые смены, фронт блокирует удаление до закрытия смен.
- Если найдены товары, сотрудники или перемещения, фронт показывает подтверждение, но финальное решение всё равно остаётся за backend.

## 3. Модель филиала на фронте

Форма списка филиалов использует поля:

| Поле | Тип | Правила UI |
|---|---|---|
| `id` | string | идентификатор |
| `name` | string | обязательно, 1-128 символов |
| `code` | string/null | slug до 64 символов, только `A-Z`, `a-z`, `0-9`, `-`, `_` |
| `address` | string/null | до 255 символов |
| `phone` | string/null | до 32 символов |
| `email` | string/null | email, до 254 символов |
| `timezone` | string | обязательно, дефолт `Asia/Bishkek` |
| `is_active` | boolean | статус филиала |
| `created_at`, `updated_at` | datetime | показываются в detail-модалке, если backend отдаёт |

На экране `/crm/branch` дополнительно есть frontend-ограничение: максимум 3 филиала. Это проверка UI перед открытием формы создания; backend всё равно должен валидировать лимит самостоятельно, если он бизнес-критичен.

## 4. Список филиалов

Экран `Branch.tsx`:

1. при монтировании вызывает `fetchBranchesAsync`;
2. хранит строку поиска локально;
3. фильтрует список на клиенте по `name`, `code`, `address`, `phone`, `email`;
4. показывает карточки с названием, статусом, адресом, телефоном, email и timezone;
5. даёт действия: просмотр карточки, активация/деактивация, редактирование, удаление.

Создание и редактирование используют одну модалку. Перед отправкой payload приводится к виду:

```ts
{
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_active: boolean;
}
```

Ошибки backend проходят через `validateResErrors`, успешные операции показывают `AlertModal`.

## 5. Карточка филиала

Экран `BranchDetails.tsx` строится вокруг hook `useBranchDetails`.

Шапка показывает:

- название филиала;
- статус `Активен` / `Неактивен`;
- адрес, телефон, email, код и timezone, если поля есть;
- кнопку `Переместить товары`, которая ведёт на `/crm/branch/transfers/new?to=<branchId>`;
- кнопку возврата к списку филиалов.

Вкладки делятся на два типа:

- базовые вкладки из `BASE_TABS`;
- секторные вкладки, собранные из `MENU_CONFIG.sector[sectorKey]`.

Базовые вкладки:

| Tab id | Название | Данные |
|---|---|---|
| `kassa` | Касса | `getCashFlows({ branch: id })` |
| `warehouse` | Склад | `GET /main/products/list/?branch=<id>&page_size=100`, все страницы |
| `sales` | Продажи | `historySellProduct({ branch: id })` |
| `analytics` | Аналитика | для магазина встраивается `/crm/market/analytics`, для остальных считается локальная сводка |
| `employees` | Сотрудники | встраивается `/crm/employ` с branch scope |
| `clients` | Клиенты | встраивается `/crm/clients` с branch scope |
| `transfers` | Перемещения | последние перемещения филиала |

Правила видимости находятся в `branchTabsConfig.ts`.

Примеры текущих правил:

- тариф `Старт` скрывает `analytics` и `employees`;
- для кафе скрыты `sales` и `warehouse`;
- для барбершопа скрыт `warehouse`;
- для школы скрыты `sales`, `warehouse`, `kassa`;
- вкладка `transfers` дополнительно скрывается, если после правил нет вкладки `warehouse`.

## 6. Фильтрация данных филиала

Большинство запросов карточки уже уходят с `branch=<id>`, поэтому backend должен возвращать отфильтрованные данные. На клиенте есть дополнительная защита от разных форматов ответа.

`filterByBranch(data, id)` ищет филиал в полях:

- `branch`;
- `branch_id`;
- `branch_uuid`;
- `primary_branch_id`;
- `branches`;
- `branch_ids`;
- `allowed_branch_ids`.

Если у записей вообще нет информации о филиале, функция считает, что данные уже отфильтрованы сервером, и не скрывает их. Это важно для товаров, движений кассы и сотрудников: часть endpoint-ов возвращает данные без явного `branch`.

`filterSalesByBranch(sales, id)` строже: если поле филиала в продажах присутствует, запись без филиала исключается из карточки конкретного филиала.

## 7. Branch scope для встроенных страниц

Часть вкладок не рисует отдельные таблицы, а встраивает существующие страницы. Это сделано компонентом `BranchEmbeddedPage`.

Встроенные маршруты:

| Route | Компонент |
|---|---|
| `/crm/market/analytics` | `@pages/analytics` |
| `/crm/employ` | `@pages/employees` |
| `/crm/clients` | `@pages/clients` |
| `/crm/pending` | `@pages/pending` |
| `/crm/shifts` | `@pages/shifts` |
| `/crm/market/procurement` | `SupplierReceiptsListPage` |
| `/crm/market/suppliers` | `Clients` с `forcedTab="suppliers"` |
| `/crm/market/documents` | `@pages/documents` |

Механизм:

1. `BranchEmbeddedPage` вызывает `holdBranchScope(scopeKey, branchId)`.
2. Axios-интерсептор в `@shared/api` вызывает `applyBranchScope(config)`.
3. Для GET-запросов без явного `branch` добавляется `params.branch = branchId`.
4. При размонтировании вызывается `releaseBranchScope`.

Исключения, куда branch scope не добавляется:

- `/users/profile`;
- `/users/branches`;
- `/users/login`;
- `/users/token`;
- `/auth`.

Если встроенная страница сама передала `branch`, интерсептор её не перезаписывает.

## 8. Текущий филиал пользователя

`branchContext.ts` также нормализует филиалы из профиля:

- `getProfileBranchIds(profile)` читает `allowed_branch_ids` или `branch_ids`;
- `getProfileBranchId(profile, company)` читает `primary_branch_id`, `primary_branch`, `active_branch`, `branch`, `branch_id`, `company.active_branch`;
- если явного основного филиала нет, но доступен ровно один филиал, он считается рабочим;
- `syncBranchScopeFromProfile(profile)` включает автоматическую подстановку `branch` для branch-bound пользователя;
- `owner` не считается привязанным к филиалу, а не-owner с `allowed_branch_ids` считается.

Администратор филиала в комментариях описан как случай, которому frontend должен явно передавать филиал, потому что backend может считать `admin` owner-like и не фильтровать автоматически.

## 9. Перемещения товаров

Перемещения являются частью функции филиалов, но имеют отдельный API-файл `transferApi.ts` и отдельные страницы.

Основные понятия:

- `MAIN_WAREHOUSE = "main"` — значение UI-фильтра для главного склада;
- в API payload `null` в `from_branch` или `to_branch` означает главный склад;
- перемещение проводится сразу при `POST`, редактирования нет;
- отмена выполняется отдельным `POST /main/branch-transfers/{id}/cancel/`.

API функции:

| Функция | HTTP | Назначение |
|---|---|---|
| `fetchTransfers(params)` | `GET /main/branch-transfers/` | история с пагинацией |
| `fetchTransfer(id)` | `GET /main/branch-transfers/{id}/` | деталка и данные для накладной |
| `createTransfer(payload)` | `POST /main/branch-transfers/` | создать и провести |
| `cancelTransfer(id, reason)` | `POST /main/branch-transfers/{id}/cancel/` | сторно |
| `searchStockProducts(branch, search, pageSize)` | `GET /main/products/list/` | поиск товаров на складе-отправителе |

### История перемещений

`BranchTransfers.tsx` хранит фильтры в URL:

| Query | Значение |
|---|---|
| `branch` | показать перемещения, где филиал отправитель или получатель |
| `dir=in` | для выбранного `branch`: только входящие (`to_branch`) |
| `dir=out` | для выбранного `branch`: только исходящие (`from_branch`) |
| `from`, `to` | точные фильтры склада-отправителя и склада-получателя |
| `status` | `completed` или `cancelled` |
| `date_from`, `date_to` | период |
| `q` | поиск, frontend отправляет как `search` |
| `page` | номер страницы |
| `open` | id перемещения для боковой карточки |

Если backend отдаёт `404` на список, UI показывает состояние «Перемещения ещё не подключены». Это ожидаемый fallback для окружений, где backend-контракт ещё не выкачен.

### Создание перемещения

`TransferCreatePage.tsx`:

1. загружает филиалы;
2. строит список мест: главный склад + все филиалы;
3. по умолчанию выбирает первый активный филиал в поле `Куда`, если маршрут не задан;
4. ищет товары на складе-отправителе через `searchStockProducts`;
5. поддерживает скан штрихкода: `Enter` по точному barcode/article или единственному результату добавляет товар;
6. валидирует количество;
7. подтверждает проведение;
8. вызывает `createTransfer`;
9. после успеха пытается скачать PDF накладной;
10. открывает историю с `open=<created.id>`.

Frontend-валидации:

- отправитель и получатель должны отличаться;
- получатель не может быть неактивным филиалом;
- дата обязательна и не позже `todayIso()`;
- должен быть хотя бы один товар;
- количество должно быть больше 0;
- для не-весового товара количество должно быть целым;
- если остаток известен, нельзя указать больше остатка.

При смене склада-отправителя или swap маршрута выбранные позиции очищаются после подтверждения. Если документ не пустой, закрытие вкладки браузера дополнительно предупреждается через `beforeunload`.

### Карточка перемещения

`TransferDetailsDrawer.tsx` открывается поверх истории по `open=<id>` и показывает:

- номер и статус;
- маршрут;
- дату документа;
- автора;
- дату создания;
- комментарий;
- позиции, количество, цену и сумму;
- данные отмены, если статус `cancelled`.

Действия:

- скачать PDF;
- открыть PDF для печати;
- повторить перемещение (`/crm/branch/transfers/new?repeat=<id>`);
- отменить проведённое перемещение с необязательной причиной.

### Вкладка «Перемещения» в карточке филиала

`TransfersSection` на `/crm/branch/:id?tab=transfers` загружает `fetchTransfers({ branch: branchId })`, показывает первые 10 записей и общий `count`. Из вкладки можно:

- привезти товары в филиал: `/crm/branch/transfers/new?to=<branchId>`;
- отправить из филиала: `/crm/branch/transfers/new?from=<branchId>`;
- открыть всю историю: `/crm/branch/transfers?branch=<branchId>`.

## 10. Аналитика карточки филиала

Для сектора «Магазин» вкладка `analytics` встраивает полноценную страницу `/crm/market/analytics` с branch scope.

Для остальных секторов используется локальная сводка `computeAnalyticsData`:

- касса: приход, расход, баланс, количество операций;
- продажи: сумма, количество, средний чек, разбивка по статусам;
- склад: розничная стоимость остатков, общее количество, количество позиций, средняя цена.

Период фильтруется локально по `created_at`.

## 11. Права и меню

Маршруты создаются через `createProtectedRoute`, а доступность пункта меню обычно управляется правами профиля в конфиге сайдбара. Для филиалов в коде прав используется `can_view_branch`.

Важно:

- frontend не является источником безопасности;
- backend обязан фильтровать данные по компании и доступным филиалам;
- branch scope помогает owner/admin смотреть конкретный филиал, но не заменяет проверку прав на backend.

## 12. Типичные точки расширения

Добавить поле филиала:

1. расширить форму и payload в `Branch.tsx`;
2. проверить отображение в карточке списка и `BranchDetails`;
3. убедиться, что backend принимает поле в `POST/PATCH /users/branches/`;
4. добавить i18n, если текст выносится в локали.

Добавить вкладку карточки филиала:

1. если вкладка общая — добавить в `BASE_TABS`;
2. если вкладка секторная — добавить/проверить route в `MENU_CONFIG`;
3. при необходимости добавить правило в `BRANCH_TABS_RULES`;
4. если страница уже существует и сама умеет грузить данные — добавить route в `EMBEDDED_PAGES`;
5. если нужна компактная таблица — добавить загрузку в `loadSectorRouteData`, колонки в `getSectorTableColumns`, строки в `getSectorRowValues`.

Подключить новый backend endpoint к branch scope:

1. использовать общий `api` из `@shared/api`;
2. для GET не передавать `branch`, если нужен текущий branch scope;
3. передавать `branch` явно, если endpoint должен игнорировать scope или использовать другой филиал;
4. добавить endpoint в `BRANCH_SCOPE_SKIP`, если филиал подставлять нельзя.

Изменить перемещения:

1. типы менять в `src/entities/branch/api/transferApi.ts`;
2. UI истории — `BranchTransfers.tsx`;
3. UI создания — `TransferCreatePage.tsx`;
4. боковую карточку и отмену — `TransferDetailsDrawer.tsx`;
5. PDF — `transferPdf.tsx` и `TransferInvoicePdf.tsx`;
6. backend-контракт синхронизировать с `docs/backend/branch-transfers-backend.md`.

## 13. Известные ограничения и риски

- Лимит «максимум 3 филиала» сейчас проверяется на frontend до открытия формы.
- Detail-модалка внутри `Branch.tsx` осталась в коде, но основной просмотр идёт через `/crm/branch/:id`; состояние `detailModalOpen` в текущем UI фактически не используется.
- Для части связанных данных backend может не отдавать поле филиала. Поэтому клиентская фильтрация в карточке намеренно мягкая.
- Перемещения зависят от backend endpoint `/main/branch-transfers/`; при `404` UI показывает «ещё не подключено».
- `searchStockProducts(null, ...)` отправляет запрос без `branch` и трактует его как главный склад. Backend должен не смешивать в таком ответе товары всех филиалов.
- `todayIso()` и даты в перемещениях считаются в timezone браузера. Бизнес-таймзона продукта — `Asia/Bishkek`; если пользователь работает из другой timezone, backend должен быть финальным валидатором дат.
- Создание перемещения блокирует кнопку на время запроса, но явный `Idempotency-Key` сейчас не отправляется.

## 14. Быстрый QA-чеклист

CRUD филиалов:

1. открыть `/crm/branch`;
2. создать филиал с обязательными полями;
3. проверить slug-валидацию `code`;
4. изменить адрес/телефон/email/timezone;
5. деактивировать и снова активировать филиал;
6. попробовать удалить филиал с открытой сменой;
7. попробовать удалить филиал с товарами/сотрудниками/перемещениями и проверить предупреждение.

Карточка филиала:

1. открыть `/crm/branch/:id`;
2. проверить шапку и вкладки по сектору/тарифу;
3. открыть `kassa`, `warehouse`, `sales`;
4. для магазина открыть `analytics` и убедиться, что запросы идут с `branch`;
5. открыть `employees` и `clients`, проверить branch scope;
6. обновить страницу с `?tab=<id>` и убедиться, что вкладка сохранилась.

Перемещения:

1. открыть `/crm/branch/transfers`;
2. проверить фильтры, поиск, период и пагинацию;
3. создать перемещение главный склад → филиал;
4. создать перемещение филиал → главный склад;
5. создать перемещение филиал → филиал;
6. проверить скан/Enter по barcode;
7. проверить запрет превышения остатка;
8. скачать и открыть PDF;
9. повторить перемещение;
10. отменить перемещение и проверить обновление истории.
