# NurCRM Market — документация для агентов (cloud / local)

Карта проекта для автономной работы: что это, где код, как запускать, куда класть изменения, какие ограничения не нарушать.

**Читать первым:** этот файл → `src/ARCHITECTURE.md` → нужный ТЗ в `docs/market/` (фронт) или `docs/backend/` (контракты API).

---

## 1. Что это за продукт

**nur-market** — standalone frontend CRM для сектора **«Магазин» / «Цветочный магазин»** экосистемы NurCRM.

- Выделен из монолита NurFront.
- Бэкенд — общий NurCRM API (`https://app.nurcrm.kg/api`), не в этом репозитории.
- Домен: POS-касса, склад, закупки, документы, клиенты/поставщики, смены, касса (cashbox), долги, аналитика, штрихкоды, весы, сотрудники, филиалы, публичный каталог.

Язык UI: русский + кыргызский (`docs/i18n.md`). Часовой пояс бизнеса: **Бишкек, UTC+6**.

---

## 2. Стек

| Слой | Технология |
|------|------------|
| UI | React 18, React Router 6 |
| Сборка | Vite 8, output → `build/` |
| State | Redux Toolkit + react-redux |
| HTTP | Axios (`@shared/api`) |
| UI kit | MUI 5 + Emotion, Tailwind CSS 4, SCSS |
| Иконки | MUI Icons, lucide-react, react-icons |
| Графики | Chart.js + react-chartjs-2 |
| PDF | `@react-pdf/renderer` (тяжёлый — грузить lazy) |
| Штрихкод | jsbarcode, `use-scan-detection` |
| i18n | i18next + react-i18next |
| Язык | TypeScript (~5.8), `strict: true`, **`noImplicitAny: false`** (временно) |
| Тесты | Vitest + Testing Library + jsdom |
| Lint | ESLint 10 + typescript-eslint + **eslint-plugin-boundaries** (FSD) |

Node в CI: **22**. Package manager: **npm**.

---

## 3. Быстрый старт

```bash
npm install
cp .env.example .env.local   # опционально, для локального бэка
npm run dev                  # http://localhost:3000
```

### Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Vite dev server, порт 3000 |
| `npm run build` | Production build → `build/` |
| `npm run lint` | ESLint, `--max-warnings 0` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run i18n:check` | Совпадение ключей ru/ky в `public/locales` |
| `npm test` | Vitest once |
| `npm run test:watch` | Vitest watch |
| `npm run preview` | Превью production build |
| `npm run printer-bridge` | Node ESC/POS bridge (`tools/printer-bridge.mjs`) — в основном cafe/legacy |

### Env

См. `.env.example`.

| Переменная | Смысл |
|------------|--------|
| `VITE_API_URL` | Base URL API. По умолчанию `https://app.nurcrm.kg/api` |
| `VITE_WS_API_URL` | Host для WebSocket (уведомления и т.п.) |
| `DEV_BACKEND` | Target proxy в Vite (default `http://localhost:8000`) |
| `VITE_REGISTER_ACCESS_PASSWORD` | Опциональный gate регистрации |
| `VITE_BUILDING_APP_URL` / `VITE_MAIN_APP_URL` | Cross-app handoff со стройкой / основным CRM |

**Локальная разработка с бэком:**

```env
# .env.local
DEV_BACKEND=http://localhost:8000
VITE_API_URL=/api
VITE_WS_API_URL=
```

Vite проксирует `/api`, `/ws` → `DEV_BACKEND`, `/media` → production CDN.

**Не коммитить** `.env`, `.env.local`, секреты.

---

## 4. Архитектура (FSD)

Слои сверху вниз:

```
app → pages → widgets → features → entities → shared
```

Правила:

1. Импорт **только вниз** по слоям (ESLint `boundaries/dependencies` — error).
2. Между слайсами одного слоя — через **Public API** (`index.ts`).
3. Сегменты слайса: `ui/`, `model/`, `api/`, `lib/`, `config/` + `index.ts`.

Aliases (Vite + tsconfig + ESLint):

| Alias | Путь |
|-------|------|
| `@` | `src/` |
| `@app` | `src/app` |
| `@pages` | `src/pages` |
| `@widgets` | `src/widgets` |
| `@features` | `src/features` |
| `@entities` | `src/entities` |
| `@shared` | `src/shared` |

Кратко: `src/ARCHITECTURE.md`.

**Исключение:** pages/widgets могут импортировать typed hooks из `@app/store` (миграция DoD).

### Дерево `src/`

```
src/
  app/           # App, providers, router, store, global styles
  pages/         # Route-level экраны (cashier, warehouse, analytics, …)
  widgets/       # Layout, Sidebar, Header, cashier-workspace, …
  features/      # auth, debts, kassa, scales, print-barcode, warehouse-ops, …
  entities/      # Redux slices + API: product, sale, warehouse, user, …
  shared/        # api client, ui kit, hooks, lib, theme, assets/scss
  types/         # глобальные типы
  main.tsx       # entry → Provider + App
```

---

## 5. Bootstrap и auth

```
src/main.tsx
  → Redux Provider (@app/store)
  → @app/App
       ThemeModeProvider, ModalProvider, ErrorBoundary, BrowserRouter
       AuthGuard (токен, profile, company, subscription, cross-app)
       Routes: publicRoutes + /crm → Layout + lazy crmRoutes
```

### Токены

- `localStorage.accessToken` (+ refresh через interceptors).
- Axios interceptor в `@shared/api/base.ts` добавляет `Authorization: Bearer …`.
- FormData: Content-Type снимается, чтобы браузер выставил boundary.

### Guards

| Компонент | Роль |
|-----------|------|
| `AuthGuard` | Есть ли токен; bootstrap profile/company; logout; redirect building-app |
| `ProtectedRoute` | Subscription gate компании; без `company` — пропускает (ждёт загрузку) |

Публичные пути: `/login`, `/register`, `/catalog/:slug`, … — `@shared/constants/routes.ts`.

После логина default: `/crm` (домашняя заглушка, **не** автопереход в кассу).

`/crm/sell` — legacy; по смыслу POS — `/crm/market/cashier`.

---

## 6. Маршруты (карта)

Роутер:

- Публичные: `src/app/router/routes.tsx` → `publicRoutes`
- CRM lazy: `src/app/router/routes/index.tsx` → `crmRoutes` = home + `commonRoutes` + `marketRoutes`
- Helpers: `createProtectedRoute` в `routes/helpers.tsx`

### Market / POS

| Path | Экран |
|------|--------|
| `/crm/market/cashier` | Касса POS |
| `/crm/market/history` | История продаж |
| `/crm/market/analytics` | Аналитика магазина |
| `/crm/market/documents` | Документы продаж |
| `/crm/market/documents/create` | Создание документа продажи |
| `/crm/market/procurement` | Закупки: история приходов + возвраты |
| `/crm/market/procurement/receipt` | Приход от поставщика |
| `/crm/market/procurement/return` | Возврат поставщику |
| `/crm/market/suppliers` | Поставщики (Clients с forcedTab) |
| `/crm/market/categories` | Категории |
| `/crm/market/bar` | Bar (market) |
| `/crm/sklad` | Склад |
| `/crm/sklad/:id` | Карточка товара |
| `/crm/sklad/add-product` | Добавление/редактирование товара |
| `/crm/clients`, `/crm/clients/:id` | Клиенты |
| `/catalog/:slug` | Публичный каталог (без CRM layout) |

### Общие CRM

| Path | Экран |
|------|--------|
| `/crm/set` | Настройки |
| `/crm/pos-print-settings` | ESC/POS / печать чеков |
| `/crm/employ`, `/crm/employ/market/:employeeId` | Сотрудники |
| `/crm/barcodes` | Печать штрихкодов |
| `/crm/scales` | Весы |
| `/crm/shifts`, `/crm/shifts/:id` | Смены |
| `/crm/branch`, `/crm/branch/:id` | Филиалы |
| `/crm/kassa/*`, `/crm/kassa/:id` | Касса (денежный учёт) |
| `/crm/debts` | Долги |
| `/crm/pending` | Pending / отложенное |
| `/crm/brand-category` | Бренды/категории |
| `/crm/additional-services` | Доп. сервисы |
| `/crm/sell`, `/crm/sell/:id` | Legacy sell (+ printService рядом) |

Меню сайдбара: `src/widgets/sidebar/ui/config/`  
Market-specific: `sectors/marketMenu.ts` + фильтр `commonMenu` в `menuConfig.ts`.  
Права — поля `permission` (`can_view_*` на профиле).

---

## 7. Redux store

Файл: `src/app/store/index.ts`.  
Хуки: `useAppDispatch`, `useAppSelector` из `@app/store`.

| Ключ reducer | Entity |
|--------------|--------|
| `user` | `@entities/user` |
| `employee` | `@entities/employee` |
| `product` | `@entities/product` |
| `departments` | `@entities/department` |
| `client` | `@entities/client` |
| `sale` | `@entities/sale` |
| `cash` | `@entities/cash` |
| `ui` | `@entities/ui` |
| `warehouse` | `@entities/warehouse` |
| `counterparty` | `@entities/counterparty` |
| `sector` | `@entities/sector` |
| `branches` | `@entities/branch` |
| `shifts` | `@entities/shift` |
| `notification` | `@entities/notification` |
| `analytics` | `@entities/analytics` |

Паттерн entity: `api/` + `model/*Slice|Creators|Thunk` + `index.ts` public API.

**Perf:** не селектить весь slice на кассе — узкие селекторы (см. `docs/market/tz-perf-fixes-aug-2026.md`).

---

## 8. API-конвенции

Клиент: `@shared/api` → `base.ts`.

- Base: `{host}/api`
- Пути на фронте: **`/main/...`**, **`/warehouse/...`**, **`/users/...`**
- **Не вводить `/api/v1/...`**, пока бэкенд явно не мигрирует (ТЗ иногда пишет v1 — игнорировать как целевой path на FE)

### Типичные группы

| Prefix | Домен |
|--------|--------|
| `/users/auth/*`, `/users/profile/`, `/users/company/` | Auth, профиль, компания |
| `/users/employees/`, `/users/branches/` | Сотрудники, филиалы |
| `/users/scales/*` | Весы |
| `/main/pos/sales/*`, `/main/pos/carts/*` | POS продажи / корзины |
| `/main/products/*` | Товары, barcode lookup, bulk |
| `/main/clients/` | Клиенты / контрагенты |
| `/main/notifications/` | Уведомления |
| `/main/analytics/market/` | Аналитика маркета |
| `/main/pos/cashier-settings/` | Настройки кассы (код удаления, max скидка) |
| `/main/products/form-layout/` | Раскладка формы создания товара (скрытые поля) |
| `/warehouse/` | Склады, бренды, категории, продукты склада, документы |

Warehouse API разбит на домены:  
`src/entities/warehouse/api/domains/*.ts` → barrel `warehouse.ts`.

POS sale thunks: `src/entities/sale/model/saleThunk.ts`.

Уведомления: REST + WebSocket `/ws/notifications/` (`@entities/notification`).

Offline: interceptor может подставить `getOfflineFallback` (cafe legacy) при network error.

---

## 9. Ключевые домены (где править)

### Касса POS

- Page: `src/pages/cashier/ui/` (`CashierPage`, `PaymentPage`, shift pages)
- Widget: `src/widgets/cashier-workspace`
- Feature hooks: `@features/create-sale` (`useMarketCashierMultiCart`, `useMarketCashierSettings`)
- State/API: `@entities/sale`
- Settings API: `@shared/api/marketCashierSettings.ts`
- Hotkeys F1–F12 уже есть; F3+0..9 — в ТЗ, не сломать существующие

Критичные сценарии: скан штрихкода, корзина, скидки, split payment, отложенные продажи, закрытие смены, печать чека.

### Склад

- Page: `src/pages/warehouse/`
- Add product: `@features/add-product`, `@features/warehouse-ops`
- Entity: `@entities/product`, `@entities/warehouse`
- Barcode helpers: `@entities/product/lib/marketWarehouseBarcodeScan.ts`, `tools/marketWarehouseBarcodeScan.js`

### Печать / ESC-POS / денежный ящик

- `src/pages/sell/ui/services/printService.ts` + `print/`
- Настройки UI: `/crm/pos-print-settings`
- localStorage ключи `escpos_*`; ящик — `escpos_drawer_*` (ТЗ модуль 5)
- WebUSB; на Windows часто нужен Zadig/WinUSB

### Касса (cashbox) / долги / смены

- Features: `@features/kassa`, `@features/kassa-worker`, `@features/debts`, `@features/open-shift`
- Pages: `shifts`, entities `cash`, `shift`

### Auth / register

- `@features/auth` (Login, Logout, Register*, AuthGuard)

### Hardware / доп. сервисы

- Штрихкоды: `@features/print-barcode`
- Весы: `@features/scales` (`is_weight` / `scale_type`)
- Доп. сервисы page: `@pages/additional-services`

---

## 10. UI и стили

- Глобальный CSS entry: `@app/styles/index.css` (Tailwind)
- SCSS auto-inject в Vite: `@shared/assets/scss/main`, `_mixin`, `_variables`
- Тема: `@shared/theme/ThemeModeProvider`
- Shared UI: `@shared/ui/*` (Modal, ConfirmModal, Loading, ErrorBoundary, …)
- Много **legacy** UI из других секторов (`legacy-cafe`, `legacy-hostel`, …) — не удалять без нужды; market — основной фокус

Дизайн-система / skills: `.cursor/skills/`, `design-system/` — для брендированных задач; в CRM обычно сохранять существующий look.

---

## 11. Tools и вспомогательный код

`tools/` — скрипты миграции и доменные хелперы (часть дублирует/тестирует логику FE):

- `migrate-js-to-ts.mjs`, `strip-nocheck*.mjs`, `fsd-*.mjs` — миграция
- `printer-bridge.mjs` — USB/сетевой bridge
- `productBarcode.js`, `barcodeAmbiguity.js`, `posSaleCarts.js`, `marketPackPieceSale.js`, … — бизнес-логика + тесты

Тесты: `src/**/*.{test,spec}.{ts,tsx}` и `tools/**/*.{test,spec}.{js,mjs}`.

---

## 12. CI

`.github/workflows/ci.yml` на push/PR в `master|main|dev`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run i18n:check`
5. `npm test`
6. `npm run build` (`VITE_API_URL=https://app.nurcrm.kg/api`)

Локально перед PR желательно прогнать тот же набор.

---

## 13. Документация домена

### i18n

Контракт ключей, глоссарий, чеклист PR: [`docs/i18n.md`](./i18n.md). Каталоги `public/locales/{ru,ky}/`. Переключатель: Настройки → Интерфейс.

### Фронт / агенты — `docs/market/`

| Файл | Содержание |
|------|------------|
| `tz-aug-2026-detailed.md` | **Актуальное** ТЗ авг 2026: 5 модулей (массовый приход, уведомления, 2-й экран, F3 hotkeys, денежный ящик) |
| `tz-aug-2026-fe-be-split.md` | Краткий FE/BE сплит (черновик; приоритет у detailed) |
| `tz-perf-fixes-aug-2026.md` | Perf: lazy PDF, узкие селекторы, долги N+1, page_size, chunks |

### Бэкенд — `docs/backend/`

Индекс: `docs/backend/README.md`. Сюда вынесены все контракты API.

| Файл | Содержание |
|------|------------|
| `tz-aug-2026-backend.md` | Контракт API по ТЗ авг 2026 |
| `procurement-history-returns-backend.md` | История закупок + возврат поставщикам |
| `procurement-recommendations-backend.md` | Рекомендуемый заказ |
| `adult-products-backend.md` | Товар 18+: поле `is_adult` |
| `cashier-settings.md` | Код удаления из корзины + max скидка |
| `alternate-barcodes.md` | Доп. штрихкоды товара |
| `analytics.md` | Фильтр аналитики по datetime (BE timezone) |
| `scales-weight-products.md` | Весовые товары / весы |
| `bulk_update_products.md` | Массовое изменение brand/category/supplier |
| `receipt-price-edit-discount.md` | Ручная цена ≠ discount в чеке |
| `shift-payment-breakdown-backend.md` | Закрытие смены: `payment_breakdown` |
| `debt-installment-schedule-backend.md` | Продажа в долг: v1 классика / v2 график платежей |
| `client-kpis-backend.md` | KPI карточки клиента: долг / аванс / продажи |
| `product-form-layout-backend.md` | Раскладка формы товара: GET/PATCH `hidden[]` |

Старые пути вроде `src/Components/...` в доменных доках — **legacy из NurFront**; в этом репо актуальные пути FSD (`src/pages/...`, `src/features/...`).

---

## 14. Текущее состояние кодовой базы (важно для агентов)

1. **Миграция JS → TS** почти по всему `src/` (`.jsx` → `.tsx`, `.js` → `.ts`). `allowJs: false`.
2. Много `: any` — `noImplicitAny` ещё выключен; не раздувать any без нужды, но и не блокировать фичи массовой типизацией.
3. В репо остаются **следы других секторов** (cafe, warehouse-sector, consulting, building cross-app) в `shared/lib`, sidebar configs, offline fallback — market — целевой продукт; не «чистить» чужой legacy без задачи.
4. Build artifacts в `build/` обычно в `.gitignore`; не коммитить build без явной просьбы.
5. `.nocheck-strip-state.json` — служебное для миграции `@ts-nocheck`.

---

## 15. Правила работы агента в этом репо

### Обязательно

- Соблюдать FSD boundaries и aliases.
- Не ломать сценарии: **касса**, **склад**, **печать ESC/POS**, **долги**, **документы**.
- API paths: `/main`, `/warehouse`, `/users` — не `/api/v1`.
- Новые слайсы — Public API через `index.ts`.
- Коммиты / push / PR — **только если пользователь явно попросил**.
- Не коммитить `.env*`, секреты, `node_modules`, лишний `build/`.

### Предпочтительно

- Менять только файлы, нужные задаче; без «попутного» рефакторинга.
- Тяжёлые зависимости (`@react-pdf`, крупные PDF-компоненты) — **dynamic import**.
- На кассе — узкие `useAppSelector`, не весь `sale`/`product` state.
- Списки — `page_size`, избегать full-list + N+1 (долги).
- Тесты для нетривиальной логики — рядом (`*.test.ts`) или в `tools/`.
- Русский UI-текст в продукте; документацию можно на RU.

### Запрещено без явного запроса

- Force push, `git config`, `--no-verify`.
- Писать exploits / атаковать чужие системы.
- Менять поведение subscription / auth gate «в обход».
- Массово удалять legacy cafe/warehouse UI «для красоты».

---

## 16. Типичные задачи → точки входа

| Задача | С чего начать |
|--------|----------------|
| Баг/фича кассы | `pages/cashier`, `features/create-sale`, `entities/sale` |
| Склад / товар / barcode | `pages/warehouse`, `entities/product`, `features/add-product` |
| Печать чека / ящик | `pages/sell/ui/services/print*`, `pages/settings` (PosPrintSettings) |
| Меню / навигация | `widgets/sidebar/ui/config` |
| Новый CRM route | `app/router/routes/marketRoutes` или `commonRoutes` + lazy page |
| Auth | `features/auth`, `entities/user`, `shared/api/authInterceptors` |
| Уведомления | `entities/notification`, `widgets/notification-modal` |
| Клиенты / KPI | `pages/clients/ClientDetails` + `docs/backend/client-kpis-backend.md` + `docs/flutter/client-debt-and-kpis.md` |
| Долги | `features/debts`, касса default v2: `pages/cashier` + `docs/backend/debt-installment-schedule-backend.md` |
| Аналитика | `pages/analytics`, `entities/analytics` |
| Права доступа | profile permissions + `permission` в menu config + Auth/Protected |
| Perf | `docs/market/tz-perf-fixes-aug-2026.md` |
| ТЗ авг 2026 | `docs/market/tz-aug-2026-detailed.md` |
| Закрытие смены / способы оплаты | `pages/cashier/CloseShiftPage`, `entities/shift/lib/paymentBreakdown`, `docs/backend/shift-payment-breakdown-backend.md` |
| Закупки / возврат поставщику | `pages/warehouse/SupplierReceiptsListPage`, `features/supplier-returns`, `docs/backend/procurement-history-returns-backend.md` |

---

## 17. Глоссарий

| Термин | Значение |
|--------|----------|
| Касса / Cashier / POS | Экран продаж `/crm/market/cashier` |
| Касса / Kassa / cashbox | Денежный учёт `/crm/kassa` (не путать с POS) |
| Склад / sklad | Товары и остатки `/crm/sklad` |
| Смена / shift | Рабочая смена кассира |
| Приход / receipt / procurement | Документ поступления от поставщика |
| Возврат поставщику / supplier return | Документ списания товара обратно поставщику |
| Alternate barcode | Доп. штрихкод товара |
| Sector | Тип бизнеса компании (market, cafe, …); этот app — market |
| Building app | Отдельное приложение стройки; cross-app auth через URL/tokens |

---

## 18. Чеклист перед сдачей изменения

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test` (если затронута логика с тестами)
- [ ] `npm run build` для крупных UI/router/chunk изменений
- [ ] Ручная проверка затронутого сценария (касса/склад/печать)
- [ ] Нет нарушений FSD import boundaries
- [ ] Новые UI-строки — через `t()`, ключи в ru и ky (`docs/i18n.md`)
- [ ] Нет секретов в diff

---

*Документ поддерживает cloud/local агентов. При расхождении с кодом приоритет у кода и актуальных ТЗ в `docs/market/tz-aug-2026-detailed.md` / `tz-perf-fixes-aug-2026.md`.*
