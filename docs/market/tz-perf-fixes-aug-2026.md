# NurCRM Market — ТЗ: исправление недочётов производительности

Спецификация работ по устранению проблем из аудита производительности (август 2026).

**Связанные материалы:** canvas `performance-audit`, код `src/` (FSD), текущий `build/assets`.

**Стек:** React 18 + Vite + Redux Toolkit. Не ломать сценарии кассы, склада, долгов, документов.

---

## Сводка

| # | Работа | Severity | Только FE | Нужен BE | Приоритет |
|---|--------|----------|-----------|----------|-----------|
| 1 | Dynamic import `@react-pdf` / InvoicePdf | P0 | **да** | нет | 1 |
| 2 | Узкие Redux-селекторы (касса и хуки entities) | P0 | **да** | нет | 2 |
| 3 | Долги: убрать full-list + N+1 deals | P0 | частично | **желательно** | 3 |
| 4 | `page_size` + виртуализация гридов | P1 | **да** | нет* | 4 |
| 5 | `productsCache` LRU/TTL + точечный селект | P1 | **да** | нет | 5 |
| 6 | Vite `manualChunks` + шрифты/CSS | P1–P2 | **да** | нет | 6 |
| 7 | Касса: условный refetch на mount | P2 | **да** | нет | 7 |
| 8 | i18n preload / Material Icons | P2–P3 | **да** | нет | 8 |

\*BE нужен только если бэк игнорирует/не поддерживает `page_size` — уточнить контракт.

**Порядок внедрения (рекомендуемый):** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

**Критерий успеха в целом:**
- открытие `/crm/market/cashier` **не** скачивает chunk `InvoicePdfDocument` (~1.4 MB) до клика «Скачать накладную»;
- скан/изменение корзины не вызывает полный ререндер дерева кассы из‑за чужих полей slice;
- модалка оплаты долга не делает N запросов deals на каждого должника без лимита;
- склад/касса явно передают `page_size`; тяжёлые списки либо виртуализированы, либо page ≤ 50 при картинках.

---

## Общие ограничения

1. Не менять публичные API Redux «ломая» все call sites за один PR без миграции: можно оставить deprecated `useSale()` и добавить `useSaleCart()` / selectors рядом.
2. Поведение оплаты, печати ESC/POS, скана штрихкода — без регрессий.
3. Измерения до/после: размер chunks (`build/assets`), опционально Network waterfall при открытии кассы (DevTools).
4. Не включать в этот ТЗ баги корректности (PendingModal статусы, ProtectedRoute, двойной долг) — отдельные задачи.

---

# Работа 1. Снять `@react-pdf` с критического пути (P0)

## 1.1 Проблема

Статический импорт тянет PDF-стек при загрузке модуля кассы (и ряда документов):

- `src/pages/cashier/ui/components/SuccessPaymentModal.tsx` — `import { pdf } from "@react-pdf/renderer"` + `InvoicePdfDocument`
- Цепочка: SuccessPaymentModal → PaymentPage → CashierSubPages → CashierPage
- В build: `cashier-*.js` импортирует `InvoicePdfDocument-*.js` (~**1.4 MB**)
- Аналогично: `Documents.tsx`, `SellDetail.tsx`, `useSupplierReceipt.tsx`, `InvoicePreviewModal.tsx`, hooks create sale document и др.

## 1.2 Цель

PDF-код и шрифты загружаются **только** в момент действия пользователя (скачать / превью PDF), не при route enter.

## 1.3 Требования FE

1. Убрать top-level `import` `@react-pdf/renderer` и `InvoicePdfDocument` из:
   - `SuccessPaymentModal.tsx` (обязательно)
   - всех экранов, где PDF нужен по клику (Documents, SellDetail, InvoicePreview, Reconciliation, supplier receipt, RecordaRates payouts и т.д.)
2. В обработчике (напр. `handleDownloadInvoice`):

```ts
const [{ pdf }, { default: InvoicePdfDocument }] = await Promise.all([
  import("@react-pdf/renderer"),
  import("@pages/documents/ui/components/InvoicePdfDocument"),
]);
const blob = await pdf(<InvoicePdfDocument data={invoiceData} />).toBlob();
```

3. Пока грузится chunk — показывать состояние loading на кнопке (уже есть `downloadingInvoice` на кассе).
4. Ошибка загрузки chunk → понятный alert/toast, без падения модалки оплаты.
5. Шрифты (`registerFonts` / Roboto TTF) должны грузиться вместе с PDF-модулем, не с entry/cashier.

## 1.4 Критерии приёмки

- [ ] В production build `cashier-*.js` **не** содержит статического import `InvoicePdfDocument` / `@react-pdf`.
- [ ] Открытие кассы в Network: chunk ~1.4 MB **не** запрашивается.
- [ ] Клик «Скачать накладную» после оплаты: chunk грузится один раз, PDF скачивается как сейчас.
- [ ] Те же проверки для Documents / SellDetail (по клику, не на mount).

## 1.5 Вне scope

- Переписывать генерацию PDF на сервер.
- Менять визуал накладной.

## 1.6 Оценка риска

Низкий. Регрессия только пути скачивания PDF.

---

# Работа 2. Узкие Redux-селекторы (P0)

## 2.1 Проблема

Хуки возвращают **весь** slice:

| Хук | Файл |
|-----|------|
| `useSale` | `saleSlice.ts` → `state.sale` |
| `useProducts` | `productSlice.ts` → `state.product` |
| `useUser` | `userSlice.ts` → `state.user` |
| `useCash` | `cashSlice.ts` → `state.cash` |
| `useClient` | `ClientSlice.ts` → `state.client` |
| `useShifts` | `shiftSlice.ts` → `state.shift` |

Касса (`useCashierShifts` / page hooks) подписывается на 5–6 slice сразу → любое `loading`/`error`/history/cache поле ререндерит POS.

Дополнительно:

- `useCashierPage` возвращает новый `vm`-объект каждый рендер.
- `ModalProvider` `value={{ openModal, openAlert }}` без `useMemo`.
- В `CashierProductsPanel` внутри `.map` повторный `cart.find` → O(products × cart).

## 2.2 Цель

Подписчики получают только нужные поля; ререндер кассы при скане/корзине ограничен панелями, которым это нужно.

## 2.3 Требования FE

### 2.3.1 Селекторы entities

1. Добавить (предпочтительно через `createSelector` / `useAppSelector`):

```ts
// примеры имён — зафиксировать в PR
useSaleCart()          // cart, cartId, totals, startSaleLoading…
useSaleCheckoutFlags() // только флаги оплаты
useProductList()       // list, count, loading, next
useProductCacheEntry(key)
useUserCompany()       // company, companyLoading, tariff…
useCashBoxes()         // list cashboxes
useClientsList()
useShiftsList()
```

2. Старые `useSale()` / `useProducts()` и т.д.:
   - либо пометить `@deprecated` и постепенно вычистить с кассы;
   - либо оставить для legacy-экранов, но **касса и Header** перевести на узкие хуки в этом же этапе.

3. Equality: для объектных выборок — `shallowEqual` или селектор с стабильной ссылкой при неизменных полях.

### 2.3.2 Касса

1. В хуках кассы убрать неиспользуемые подписки (напр. `useCash()`, если результат не читается).
2. Не прокидывать monolithic `vm` без мемоизации: `useMemo` по полям **или** Context с мемоизированным value **или** разбить props.
3. `CashierProductsPanel`: один раз построить `Map(productId → cartLine)` / `Set` перед `.map`.

### 2.3.3 Shared

1. `ModalProvider`: `useMemo` для context value (по аналогии с `ThemeModeProvider`).

## 2.4 Критерии приёмки

- [ ] Касса не подписана на `state.sale` целиком; изменение `sale.history` / documents не ререндерит POS (проверка React Profiler или временный counter).
- [ ] Скан товара / qty± ререндерит cart panel и затронутые product cards, не весь layout+header без нужды.
- [ ] `useAppDispatch` / `useAppSelector` используются вместо `useDispatch() as any` в затронутых файлах кассы (по возможности в том же PR).
- [ ] Нет регрессий: старт смены, multi-cart, оплата, F-keys.

## 2.5 Вне scope

- Полный отказ от `any` во всех slices.
- Разбиение `saleSlice` на несколько reducer’ов (можно фаза 2).

## 2.6 Оценка риска

Средний (много call sites). Делать PR: (A) новые селекторы + касса, (B) остальные экраны.

---

# Работа 3. Долги: full-list и N+1 (P0)

## 3.1 Проблема

`src/pages/cashier/ui/components/DebtPaymentModal.tsx`:

1. `fetchAllPages("/main/clients/with-debts/")` — все страницы должников.
2. Для **каждого** клиента: `fetchAllPages(/main/clients/${id}/deals/?kind=debt)` через `Promise.allSettled` — классический **N+1**.
3. Цель — посчитать `remaining_debt` в `Map` для списка.

Обязательно в scope:

- `DebtPaymentModal.tsx` — N+1 deals (см. выше).
- `src/features/debts/ui/Debts.tsx` — `fetchDebtsAll()` обходит до **60** страниц `/main/debts/` в один массив без виртуализации UI.

Вне минимального scope (отдельный тикет при необходимости): `branchDetails.utils.ts` с массовым `fetchAllPages` по секторам.

## 3.2 Цель

Список должников с суммой долга за 1–2 запроса (или пагинация UI без N+1). Открытие модалки на 50+ должниках — секунды → доли секунды / прогресс.

## 3.3 Frontend (можно сразу, без BE)

### Вариант FE-A (быстрый, без нового API)

1. **Не** грузить deals для всех клиентов при открытии модалки.
2. Список должников: первая страница `with-debts` (+ поиск с debounce), пагинация «Ещё» / infinite scroll.
3. Сумму долга брать из поля клиента, если бэк уже отдаёт (`total_debt` / `remaining_debt` / аналог) — **проверить ответ API** и задокументировать в PR.
4. Deals грузить **только** при выборе клиента (`selectedClient`) — один `fetchAllPages` или лучше одна страница deals с пагинацией внутри карточки.
5. Ограничить concurrency, если временно нужен batch (напр. p-limit 5) — только как interim, не как финал.

### Вариант FE-B + Backend (предпочтительно для продакшена)

| Endpoint | Назначение |
|----------|------------|
| `GET /main/clients/with-debts/?page=&page_size=&search=` | Клиенты с долгом + **агрегат** `total_remaining_debt` в каждом элементе |
| `GET /main/clients/{id}/deals/?kind=debt&page=&page_size=` | Сделки выбранного клиента (без обхода всех страниц на старте) |

Если агрегата нет — добавить поле на BE (один SQL/`annotate`), не N запросов с FE.

## 3.4 Требования к UX

- Skeleton / loader на список и на deals выбранного клиента раздельно.
- Отмена запросов при закрытии модалки (`AbortController` / cancelled flag — уже частично есть).
- Ошибка одного клиента не валит весь список.

## 3.5 Критерии приёмки

- [ ] При открытии DebtPaymentModal число HTTP-запросов **не** растёт пропорционально N должников (нет N× deals).
- [ ] Список поддерживает поиск и пагинацию (или явный page_size ≤ 50).
- [ ] Выбор клиента показывает его deals; оплата installments работает как сейчас.
- [ ] На 100 должниках модалка открывается без «минуты ожидания» (ручной тест / Network).

## 3.6 Чеклист BE

- [ ] Есть ли уже `total_remaining_debt` (или аналог) в `with-debts`?
- [ ] Если нет — добавить агрегат + пагинацию/search.
- [ ] Документировать контракт в `docs/backend/` (короткий addon к этому ТЗ или отдельный md).

## 3.7 Оценка риска

Средний. Меняется загрузка данных модалки; сценарий оплаты долга — регрессионно критичен.

---

# Работа 4. `page_size` и виртуализация (P1)

## 4.1 Проблема

- UI кассы/склада предполагает ~100 товаров на страницу, но запросы **не всегда** передают `page_size`.
- Нет `react-window` / `@tanstack/react-virtual` в проекте.
- Склад: `PAGE_SIZE = 100`, `ProductTable` мапит все строки (есть `React.memo` + `loading="lazy"` — сохранить).
- Касса: `CashierProductsPanel` мапит `filteredProducts`.

## 4.2 Требования FE

1. Во всех fetch товаров кассы и склада явно: `page_size: PAGE_SIZE` (константа в одном месте на фичу).
2. Согласовать константу с бэком (если max page_size меньше — выровнять UI).
3. Виртуализация:
   - **Склад (таблица/карточки):** virtualizer по вертикали при page_size ≥ 50 или всегда.
   - **Касса (сетка товаров):** virtualizer или уменьшить page до 40–60 без виртуализации (зафиксировать выбор в PR).
4. Не виртуализировать мелкие списки (&lt; 30) без нужды.
5. Сохранить `key={product.id}` (не index).

## 4.3 Критерии приёмки

- [ ] В Network на кассе/складе в query есть `page_size`.
- [ ] `count` / пагинация UI совпадают с ответом API.
- [ ] Скролл склада при 100 товарах с картинками без явных фризов (субъективно + Profiler optional).
- [ ] Скан/клик по товару в виртуализированном гриде работает.

## 4.4 Вне scope

- Курсорная пагинация на BE.
- CDN image transforms (фаза 2: srcset/webp).

---

# Работа 5. `productsCache` LRU / TTL (P1)

## 5.1 Проблема

`productSlice.productsCache` — словарь полных страниц по сериализованным params; растёт при навигации по фильтрам. Селекторы часто отдают весь `productsCache`.

## 5.2 Требования FE

1. Политика кэша (выбрать и задокументировать):
   - **LRU:** max N ключей (рекомендуется **20–30**);
   - и/или **TTL:** напр. 5 минут.
2. При превышении — вытеснять самые старые ключи.
3. Селекторы: `selectProductsCacheEntry(state, key)` — не подписываться на весь объект cache.
4. `clearProducts` / logout — очищать cache.
5. Не кэшировать ошибочные ответы.

## 5.3 Критерии приёмки

- [ ] После 50+ разных запросов list число ключей в cache ≤ max.
- [ ] Повторный запрос тех же params за TTL берёт cache (как сейчас задумано) без лишнего network — сохранить текущий UX склада.
- [ ] Нет утечки подписок на весь `productsCache` в warehouse hooks.

---

# Работа 6. Vite chunks и CSS/шрифты (P1–P2)

## 6.1 Проблема

- `vite.config.js` `build`: только `outDir`, `sourcemap` — нет `manualChunks`.
- `css.preprocessorOptions.scss.additionalData` инжектит `main.scss` (+ mixin/vars) в **каждый** SCSS.
- Google Fonts / Material Icons: `index.html` blocking stylesheet; Montserrat через SCSS.

## 6.2 Требования FE

### 6.2.1 manualChunks

Пример политики (уточнить по фактическим именам пакетов):

```js
manualChunks(id) {
  if (id.includes("node_modules")) {
    if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
    if (id.includes("@mui")) return "vendor-mui";
    if (id.includes("@react-pdf")) return "vendor-react-pdf";
    if (id.includes("chart.js") || id.includes("react-chartjs")) return "vendor-charts";
    // остальное — default vendor
  }
}
```

Не ломать lazy routes: PDF/charts остаются отдельными chunks и грузятся по требованию.

### 6.2.2 SCSS / шрифты

1. Не прокидывать `_fonts.scss` / Google `@import` через `additionalData`.
2. Подключить нужные шрифты **один раз** в `src/app/styles/index.css` (или self-host).
3. `additionalData` оставить только variables/mixins без side-effect импортов шрифтов/глобальных стилей, **если** это не сломает существующие SCSS (проверить build). Если `main.scss` обязателен исторически — вынести из него font `@import`.

### 6.2.3 Material Icons

1. Аудит использования `Material Icons` vs `lucide-react` / `react-icons`.
2. Если Material почти не нужен — убрать link из `index.html`.
3. Если нужен — self-host subset, не blocking Google CDN.

## 6.3 Критерии приёмки

- [ ] `npm run build` успешен; lazy routes работают.
- [ ] `vendor-react` / `vendor-mui` (или эквивалент) кэшируются отдельно от page chunks.
- [ ] CSS chunks не дублируют один и тот же `@import` Google Fonts десятки раз.
- [ ] First paint не блокируется лишним Material Icons, если иконки удалены/self-host.

---

# Работа 7. Касса: refetch на mount (P2)

## 7.1 Проблема

`useCashierCartSync` (и аналоги) на каждом входе в кассу: `fetchClientsAsync`, `fetchShiftsAsync`, `getCashBoxes` без учёта свежести данных в store.

## 7.2 Требования FE

1. Ввести простую политику stale (напр. refetch если данных нет **или** `fetchedAt` старше 60–120 с).
2. Хранить `fetchedAt` в slice или module-level / sessionStorage (предпочтительно в slice meta).
3. Принудительный refresh — по явному действию пользователя (pull / кнопка), не каждый mount.
4. Не блокировать старт продажи ожиданием clients, если clients не нужны до модалки клиента.

## 7.3 Критерии приёмки

- [ ] Повторный заход на кассу в течение TTL не дублирует три тяжёлых списка.
- [ ] После logout/login данные обновляются.
- [ ] Смена филиала/компании инвалидирует кэш.

---

# Работа 8. i18n и мелочи (P2–P3)

## 8.1 i18n

Файл: `src/shared/config/i18n.ts`

Сейчас:

```ts
ns: ["translation", "newLanding"],
preload: ["translation", "newLanding"], // фактически ns, не lng — сомнительно
```

Требования:

1. Для CRM Market: defaultNS `translation`; `newLanding` грузить только на лендинг-роутах (или убрать preload).
2. `preload` выставить корректно по lng (`["ru"]`) **или** убрать, полагаясь на detector + HttpBackend.
3. Не увеличивать bundle локалей (HttpBackend сохранить).

## 8.2 Прочее (по желанию в том же эпике)

- Header: не `fetchNotifications` на каждый remount — stale-while-revalidate / один fetch на layout.
- Printer poll 2s: увеличить интервал или `document.visibilityState`.
- `key={index}` в списках с id — заменить на стабильный id (точечно, не массовый косметический PR).

## 8.3 Критерии приёмки

- [ ] CRM не качает `newLanding` JSON без нужды (Network).
- [ ] Переключение ru/ky работает.
- [ ] Лендинг (если есть в этом репо) по-прежнему получает свой ns.

---

## План PR / спринтов

| PR | Содержание | Зависимости |
|----|------------|-------------|
| PR-1 | Dynamic import PDF (касса + критичные call sites) | — |
| PR-2 | Селекторы + рефактор подписок кассы + Map в products panel + ModalProvider memo | — |
| PR-3 | DebtPaymentModal без N+1 (+ BE aggregate если согласован) | Согласование поля долга |
| PR-4 | page_size + virtualizer / уменьшение page | — |
| PR-5 | productsCache LRU | PR-2 желателен |
| PR-6 | vite manualChunks + fonts cleanup | После PR-1 (чтобы PDF chunk стабилен) |
| PR-7 | cashier mount TTL + i18n/icons | — |

Каждый PR: `npm run typecheck && npm run lint && npm run test && npm run build`.

---

## Тест-план

### Bundle / PDF
1. `npm run build` → убедиться, что cashier chunk не импортирует InvoicePdfDocument статически (`rg` по `build/assets/cashier-*.js`).
2. DevTools Network: открыть кассу → нет запроса ~1.4 MB pdf chunk.
3. Оплатить (или открыть success modal с saleId) → Скачать накладную → chunk + PDF ok.

### Селекторы
4. React Profiler: изменить несвязанное поле sale (если доступно) → POS не flash.
5. Скан штрихкода → товар в корзине, UI отзывчив.

### Долги
6. Открыть DebtPaymentModal при ≥20 должниках → в Network нет 20+ `/deals/`.
7. Выбрать клиента → deals грузятся; оплата installments ok.

### Пагинация / виртуализация
8. Касса/склад: query содержит `page_size`.
9. Скролл длинного списка; клик по товару вне viewport после скролла.

### Cache / Vite / i18n
10. Много фильтров на складе → cache size ограничен.
11. Повторный визит кассы &lt; TTL → меньше refetch.
12. CRM load: нет лишнего `newLanding`.

---

## Метрики «до / после» (заполнить в PR-1 и PR-3)

| Метрика | До | После |
|---------|----|-------|
| Размер статически связанных с cashier PDF-зависимостей | ~1.4 MB chunk | 0 до клика |
| HTTP при open DebtPaymentModal (N=50 должников) | ~1 + 50×pages | ≤ 2–3 (+ pages списка) |
| Подписки кассы на целые slices | 5–6 | 0 целых; только поля |

---

## Чеклист согласования с Backend (работа 3)

- [ ] Поля агрегата долга в `GET /main/clients/with-debts/`
- [ ] Пагинация + `search` на with-debts
- [ ] Поддержка `page_size` на `GET /main/products/list/` и складских list (если ещё не везде)
- [ ] Опционально: bulk mark-read уведомлений (вне критического пути этого ТЗ)

---

## История

| Дата | Изменение |
|------|-----------|
| 2026-08-09 | Первая версия ТЗ по аудиту производительности |
