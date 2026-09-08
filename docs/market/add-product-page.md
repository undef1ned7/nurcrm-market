# AddProductPage — создание и редактирование товара (веб)

Полная документация экрана склада **«Создание / редактирование товара»** во фронтенде `nur-market`.

| | |
|---|---|
| **Маршруты** | `/crm/sklad/add-product`, `/crm/sklad/add-product/:id` |
| **Оркестратор** | `src/features/warehouse-ops/ui/AddProductPage.tsx` |
| **Модуль** | `src/features/warehouse-ops/ui/AddProductPage/` |
| **Public API** | `@features/add-product` (re-export) и `@features/warehouse-ops` |
| **Роутер** | `src/app/router/routes/commonRoutes.tsx` (lazy) |
| **Валюта UI** | COM (сом) |
| **Таймзона** | Asia/Bishkek, UTC+6 |

**Связанные документы**

| Документ | Зачем |
|----------|--------|
| [`docs/PROJECT.md`](../PROJECT.md) | Карта всего проекта |
| [`docs/flutter/add-product.md`](../flutter/add-product.md) | Паритет для мобильного клиента (поля, API 1:1) |
| [`docs/backend/product-form-layout-backend.md`](../backend/product-form-layout-backend.md) | Раскладка формы `hidden[]` |
| [`docs/backend/adult-products-backend.md`](../backend/adult-products-backend.md) | Флаг 18+ |
| [`docs/backend/alternate-barcodes.md`](../backend/alternate-barcodes.md) | Доп. штрихкоды |
| [`docs/market/scales-and-plu.md`](./scales-and-plu.md) | **Весы и PLU** — полная документация |
| [`docs/backend/scales-weight-products.md`](../backend/scales-weight-products.md) | Контракт API весов (бэкенд) |

---

## 1. Назначение

Экран позволяет:

1. **Создать** товар, услугу или комплект вручную.
2. **Создать** товар через **сканирование** штрихкода (отдельная вкладка).
3. **Редактировать** существующий товар по `:id`.
4. **Дублировать** товар (навигация на создание с `location.state` / данными исходного).
5. Работать **встроенно** (embedded) из прихода поставщика — без ухода на склад.

После успешного сохранения: алерт → пауза ~1.5 с (`NAVIGATION_DELAY`) → возврат на склад или `returnTo` / callback embedded.

---

## 2. Точки входа и props

### 2.1. Роуты

```tsx
// commonRoutes.tsx
createProtectedRoute("sklad/add-product", AddProductPage)      // создание
createProtectedRoute("sklad/add-product/:id", AddProductPage) // редактирование
```

Lazy-импорт: `import("@features/add-product")` → re-export из `warehouse-ops/ui/AddProductPage`.

### 2.2. Props оркестратора

```ts
AddProductPage({
  embedded = false,                 // modal/sheet внутри другого экрана
  embeddedPrefillSupplierId = "",   // UUID поставщика
  embeddedReturnTo = "",            // путь возврата (логика embedded)
  onEmbeddedClose = null,           // закрыть без сохранения
  onEmbeddedSaved = null,           // после успешного create
  forceProductOnly = false,         // скрыть услугу/комплект, только «товар»
})
```

**Пример встроенного использования** — приход от поставщика:

`src/pages/warehouse/ui/supplierReceipt/components/SupplierReceiptModals.tsx`

- `embedded`, `forceProductOnly`
- `embeddedPrefillSupplierId={selectedSupplierId}`
- `embeddedReturnTo="/crm/market/procurement/receipt"`

### 2.3. Навигационный state

| Поле `location.state` | Смысл |
|----------------------|--------|
| `returnTo` | Куда вернуться вместо `/crm/sklad` |
| `prefillSupplierId` | Предзаполнить поставщика |
| данные для дубликата | Гидрация формы без id (см. bootstrap) |

Приоритет `returnTo`: `embeddedReturnTo` → `location.state.returnTo` → `/crm/sklad`.

---

## 3. Архитектура UI

```
AddProductPage.tsx                    # тонкий оркестратор
├── ProductFormLayoutProvider         # раскладка скрытых блоков
├── AlertModal
├── PageShell / PageHeader / PagePanel
│   ├── LayoutHeaderActions           # «Настроить форму» (owner/admin)
│   ├── вкладки: Ввод вручную | Сканирование  (только create)
│   ├── activeTab === 1 → AddProductBarcode
│   └── иначе → MarketProductForm     # основная форма market
│       (ManualEntryForm — legacy-ветка при loading edge-case)
└── hooks/useAddProductPage           # вся логика состояния
```

**Правило:** `AddProductPage.tsx` не держит бизнес-логику — только wiring props → `useAddProductPage` → дочерние компоненты.

Роль пользователя (`profile.role`): `owner` / `admin` → `canCustomizeForm = true` (кнопка настройки раскладки).

---

## 4. Дерево файлов модуля

```
AddProductPage/
├── constants.ts                 # ITEM_TYPES, DEFAULT_*, TABS, NAVIGATION_DELAY
├── utils/
│   ├── barcodeUtils.ts          # EAN-13 checksum / generate
│   ├── debtUtils.ts             # createDebt, validateDebtData
│   ├── productUtils.ts          # buildProductPayload, validate*, promotion, alternate barcodes
│   ├── kitPickerUtils.ts        # фильтры кандидатов в комплект
│   └── index.ts
├── hooks/
│   ├── useAddProductPage.ts     # фасад: собирает все доменные хуки
│   ├── useAddProductBootstrap.ts# загрузка справочников + hydrate edit/duplicate
│   ├── useAddProductSubmitFlow.ts # create/update + images + debt + cash
│   ├── useMarketProductState.ts # itemType, marketData, kit
│   ├── useProductImages.ts
│   ├── useDebtForm.ts
│   ├── useSupplierForm.ts
│   ├── useBrandCategoryDict.ts
│   ├── useBrandCategoryForms.ts
│   ├── useKitProducts.ts
│   ├── useProductPriceCalculation.ts
│   ├── useProductFormState.ts
│   ├── useProductSubmit.ts      # legacy/вспомогательный
│   └── addProductHelpers.ts     # sanitizePriceTo3Decimals и пр.
├── formLayout/                  # настраиваемая раскладка блоков
│   ├── ProductFormLayoutContext.tsx
│   ├── useProductFormLayout.ts
│   ├── FormBlock.tsx, CustomizeBar.tsx, AddFieldsSheet.tsx
│   ├── LayoutHeaderActions.tsx
│   ├── api.ts, storage.ts, constants.ts, types.ts, hasBlockValue.ts
│   └── *.test.ts
├── components/
│   ├── MarketProductForm.tsx    # главная форма
│   ├── ManualEntryForm.tsx      # legacy
│   ├── ProductTypeSelector.tsx
│   ├── ProductBasicInfo.tsx
│   ├── ProductImagesSection.tsx
│   ├── PackagingSection.tsx
│   ├── PromotionRulesEditor.tsx
│   ├── CountryField.tsx
│   ├── KitProductsPickerModal.tsx
│   └── sections/
│       ├── BrandCategorySection.tsx
│       ├── PluCodeSection.tsx
│       ├── CharacteristicsSection.tsx
│       ├── ProductWarehouseSection.tsx
│       ├── ServicePricingSection.tsx
│       ├── KitCompositionSection.tsx
│       └── MarketFormActions.tsx
└── AddProductBarcode/           # соседний модуль (вкладка «Сканирование»)
```

Рядом: `AddProductPage.scss`, `formLayout/ProductFormLayout.scss`.

---

## 5. Режимы экрана

| Режим | Условие | UI |
|-------|---------|-----|
| Создание | нет `:id` | Вкладки «Вручную / Сканирование», выбор типа |
| Редактирование | есть `:id` | Без вкладок, тип **нельзя сменить**, loading → форма |
| Сканирование | create + `activeTab === 1` | `AddProductBarcode` |
| Embedded | `embedded === true` | То же create; закрытие через callbacks |
| Только товар | `forceProductOnly` | Селектор типа скрыт / принудительно `product` |

Маппинг UI-типа → API `kind`:

| UI (`itemType`) | API `kind` |
|-----------------|------------|
| `product` | `product` |
| `service` | `service` |
| `kit` | `bundle` |

Обратно при загрузке: `service` → услуга, `bundle` → комплект, иначе товар.

---

## 6. Состояние формы

Два основных объекта + флаги:

### 6.1. `newItemData`

Базовые поля ввода (часть уходит в API напрямую):

| Поле | Назначение |
|------|------------|
| `name` | Наименование (обязательно) |
| `barcode` | Основной штрихкод |
| `brand_name` / `category_name` | Имена справочников |
| `price` / `wholesale_price` / `purchase_price` | Цены (строки, до 3 знаков) |
| `quantity` | Остаток (товар) |
| `client` | UUID поставщика |
| `plu` / `scale_type` | Весы (часто дублируется в `marketData`) |

### 6.2. `marketData`

Расширенные поля маркета (`DEFAULT_MARKET_DATA` в `constants.ts`):

- `code`, `article`, `unit`, `hotkeyGroup`
- флаги: `isWeightProduct`, `isAdult`, `isFractionalService`, `enablePieceSale`, `stock` (акция)
- `plu`, габариты, `description`, `country`
- `purchasePrice` (зеркало), `markup`, `discount`, `supplier`, `minStock`, `expiryDate`
- `kitProducts[]`, `packagings[]`, `alternateBarcodesText`
- `promotionRules[]`

### 6.3. Прочее

- `images[]` — локальные + серверные (`id` / `file`). Новые локальные файлы проходят через очередь кадрирования (`useProductImages` + `ImageCropperModal`): zoom, rotation ±90°, EXIF bake перед превью. Уже загруженные на сервер (`id`, без `file`) кроппером не редактируются.
- долг: `debt`, `amount`, `debtMonths`, `showDebtForm`, `debtState`
- `fieldErrors` — ошибки валидации по полям
- `cashData` / `selectCashBox` — расход в кассу при закупке
- бренды/категории: словари + inline-создание

---

## 7. Bootstrap (`useAddProductBootstrap`)

При монтировании:

| Действие | API / источник |
|----------|----------------|
| Клиенты (поставщики) | `fetchClientsAsync` → filter `type === "suppliers"` |
| Кассы | `getCashBoxes` |
| Список товаров `page_size=100` | `fetchProductsAsync` — `count`, весовые, кандидаты в kit |
| Prefill поставщика | `prefillSupplierId` → `newItemData.client` |
| Редактирование | `GET /main/products/{id}/` → hydrate |
| Авто-штрихкод | `generateEAN13Barcode()` если пусто (create) |
| Авто-код | `pad(count+1)` → `marketData.code` (read-only, **не** в API) |
| Артикул | по умолчанию = код, пока пользователь не менял |
| PLU | при весе/дробной услуге: `weightProductsCount + 1` |
| Раскладка формы | внутри `ProductFormLayoutProvider` → GET layout |

Цены при hydrate округляются до **3** знаков; хвостящие нули в дробной части убираются утилитами (`stripTrailingZeros`).

`is_adult` при загрузке может дополняться локальным `isAdultProduct(id, companyId)`.

---

## 8. Основная форма (`MarketProductForm`)

### 8.1. Порядок блоков (товар)

1. `ProductTypeSelector` (create; скрыт при `forceProductOnly` / edit)
2. `ProductBasicInfo` — имя, код, barcode, alternate, article, hotkey
3. `ProductImagesSection` — выбор/drag&drop → **кроппер** (`@shared/ui/ImageCropperModal`) → в `images[]` попадает уже обрезанный `File`
4. `BrandCategorySection` (+ inline create brand/category/supplier)
5. Единица / вес / 18+ / поштучная продажа / `PackagingSection` / количество
6. `PromotionRulesEditor` (если акция)
7. `PluCodeSection` (весовой)
8. `CharacteristicsSection` + описание
9. Страна (`CountryField`)
10. Цены: закупка, наценка, продажа, опт, скидка
11. `ProductWarehouseSection` — поставщик, долг, мин. остаток, срок
12. `CustomizeBar` / `AddFieldsSheet` (раскладка)
13. `MarketFormActions` — Отмена / Сохранить

### 8.2. Услуга

Без склада/закупки/акции/поставщика/долга/срока в том же виде.  
Цены: продажа + скидка; флаг «дробная услуга» → `is_weight` на API.

### 8.3. Комплект

`KitCompositionSection` + модалка `KitProductsPickerModal`  
(`fetchProductsAsync` с `kind: product`, `page_size: 500`).  
Цена комплекта пересчитывается из состава; payload `kind: "bundle"`.

### 8.4. Расчёт цены продажи (товар)

Пока цена **не** менялась вручную:

```
selling = purchase_price * (1 + markup / 100)
```

При ручном изменении цены → пересчёт `markup` от закупки.  
Флаг `isPriceManuallyChanged` сбрасывается при смене закупки/наценки.

Цены санитизируются до 3 знаков после запятой (`,` → `.`).

### 8.5. FormBlock / раскладка

Каждый опциональный блок обёрнут в `FormBlock` с id из `PRODUCT_FORM_BLOCK_IDS`.  
Если id в `hidden` **и** у товара нет значения блока (`hasBlockValue`) — UI скрыт.  
Если значение есть — блок показывается даже при `hidden` (чтобы не потерять данные).

Нельзя скрыть: наименование, количество, ключевые цены, тип, кнопки действий.

---

## 9. Раскладка формы (`formLayout/`)

| | |
|---|---|
| API | `GET/PATCH /main/products/form-layout/` |
| Fallback | `localStorage` ключ `market_product_form_layout:{companyId}` |
| Кто меняет | `owner` / `admin` |
| Кто читает | любой сотрудник компании |

Блоки (`hidden[]`):  
`code`, `barcode`, `alternateBarcodes`, `article`, `hotkey`, `images`, `category`, `brand`, `unit`, `pieceSale`, `weight`, `adult`, `packaging`, `markup`, `wholesale`, `discount`, `supplier`, `debt`, `minStock`, `country`, `expiry`, `promotion`, `characteristics`, `description`, `plu`.

При `404` / `405` / `501` — тихий fallback на localStorage (бэкенд может быть ещё не задеплоен).

UI: `LayoutHeaderActions` → режим customize → `CustomizeBar` + `AddFieldsSheet`.

---

## 10. Submit (`useAddProductSubmitFlow`)

Последовательность:

1. Сброс `fieldErrors`.
2. `validateProductData` — обязательные поля по типу.
3. Если включён долг без поставщика → алерт.
4. `validateDebtData`.
5. `buildProductPayload({ newItemData, marketData, itemType, weightProductsCount })`.
6. `createProductAsync` или `updateProductAsync`.
7. `rememberAdultProduct` (локальный кэш 18+).
8. Картинки:
   - edit: `DELETE` удалённых `/main/products/{id}/images/{imageId}/`
   - upload новых через `FormData` + `multipart`
   - ошибки upload **не откатывают** товар; пользователю показывается warning через `AlertModal` (товар сохранён)
9. При создании товара с закупкой: расход в кассу через `postCashflowIfNeeded` (legacy FE POST; при `VITE_BE_CASHFLOWS=true` — no-op, пишет бэк — см. [`docs/backend/kassa/auto-cashflows-backend.md`](../backend/kassa/auto-cashflows-backend.md)); при долге — сделка/долг (`createDeal` / `createDebt`).
10. Успех / warning по фото → алерт → `onEmbeddedSaved` или `navigate(returnToPath)` через ~1.5 с.
11. Ошибки API → `validateResErrors` → `fieldErrors` / алерт.

Статус cash flow: тариф **«Старт»** → `approved`, иначе `pending`.

---

## 11. Payload API (кратко)

Формируется в `buildProductPayload` (`utils/productUtils.ts`).

**Общее:** `name`, `barcode`, `alternate_barcodes[]`, `brand_name`, `category_name`, `article`, `unit`, `is_weight`, `is_adult`, `price`, `wholesale_price`, `discount_percent`, `country`, `expiration_date`, `client`, `plu`, `hotkey_group`, `description`, `characteristics`, `kind`.

**Товар:** + `purchase_price`, `markup_percent`, `quantity`, `stock`, `promotion_rules_input`, `packages_input` (если piece sale).

**Услуга:** `quantity: 0`, `purchase_price: "0"`, `stock: false`, `is_weight` = дробная услуга.

**Комплект:** состав через packaging/kit mapping + `kind: "bundle"`.

Доп. штрихкоды: парсинг текста по `\n`, `,`, `;`; дубли и совпадение с основным отбрасываются (`parseAlternateBarcodesForApi`).

Акции: до 30 ступеней; в API `promotion_rules_input` с `position`, `min_amount`, `discount_percent`, опционально `promo_quantity`.

Код товара (`marketData.code`) **не отправляется**.

Эндпоинты:

| Метод | Путь |
|-------|------|
| POST | `/main/products/` |
| PATCH/PUT | `/main/products/{id}/` (через thunk update) |
| GET | `/main/products/{id}/` |
| POST | `/main/products/{id}/images/` |
| DELETE | `/main/products/{id}/images/{imageId}/` |

Детали полей и edge-cases — в [`docs/flutter/add-product.md`](../flutter/add-product.md).

---

## 12. Вкладка «Сканирование»

Компонент: `../AddProductBarcode` (`AddProductBarcodeView` + `useAddProductBarcode`).

- Ждёт скан штрихкода, подтягивает/создаёт товар упрощённым флоу.
- Колбэки: `onShowSuccessAlert`, `onShowErrorAlert`, `onShowSupplierCreated`, `onClose`.
- После успеха — тот же паттерн: алерт → return через 1.5 с.
- Переиспользует `PromotionRulesEditor` и `productUtils`.

---

## 13. Валидация (фронт)

`validateProductData` (обязательное зависит от `itemType`):

- имя;
- для товара — осмысленные цены/количество по правилам утилиты;
- комплект — непустой состав;
- и т.д. (см. `productUtils.ts`).

Долг: поставщик обязателен; суммы/месяцы — `validateDebtData` + ограничения тарифа компании.

Ошибки бэка мапятся на поля формы через `validateResErrors`.

---

## 14. Права и тарифы

| Условие | Эффект |
|---------|--------|
| `role` owner/admin | Настройка раскладки формы |
| Иначе | Только чтение раскладки |
| `subscription_plan.name === "Старт"` | Cash flow сразу `approved` |
| Иначе | Cash flow `pending` |
| Нет subscription / ProtectedRoute | Общий gate приложения (не специфичен странице) |

---

## 15. Стили и UX-оболочка

- `PageShell` / `PageHeader` / `PagePanel` из `@shared/ui/page-shell`
- Кнопки: классы `nur-btn`, `nur-btn--secondary`
- Иконки: `lucide-react` (`ArrowLeft`, `Package`, `Scan`)
- SCSS страницы + SCSS раскладки
- Алерты: `@shared/ui/AlertModal`

Заголовки сейчас **захардкожены на русском** (не через `t()`):  
«Создание товара» / «Редактирование товара». При i18n-задаче — вынести в `public/locales/{ru,ky}`.

---

## 16. Тесты

В модуле уже есть:

- `formLayout/storage.test.ts`
- `formLayout/api.test.ts`
- `formLayout/hasBlockValue.test.ts`

Рекомендуемые зоны для новых тестов: `productUtils` (payload, alternate barcodes, promotion), `barcodeUtils`, валидация.

Запуск: `npm test`.

---

## 17. Как править безопасно

| Задача | Куда идти |
|--------|-----------|
| Новое поле в форме | `MarketProductForm` + section + `marketData`/`newItemData` + `buildProductPayload` + при необходимости block id в `formLayout` |
| Валидация | `utils/productUtils.validateProductData` |
| Submit / побочные эффекты | `useAddProductSubmitFlow` |
| Загрузка edit | `useAddProductBootstrap` |
| Раскладка | `formLayout/*` + backend-док |
| Скан | `AddProductBarcode/*` |
| Embedded из закупок | props + `SupplierReceiptModals` |

**Не делать без нужды:** раздувать `AddProductPage.tsx`; дублировать payload вне `buildProductPayload`; ломать `FormBlock` ids (рассинхрон с BE/Flutter).

FSD: страница живёт в `features/warehouse-ops`; тонкий barrel `@features/add-product` — для роутера. Импорты сущностей — через `@entities/product|client|cash|user|sale`.

---

## 18. Известный технический долг

1. `ManualEntryForm` — legacy-ветка; основной путь — `MarketProductForm`.
2. Много props drilling в `MarketProductForm` (40+); рефактор — через контекст/группировку, не через новый монолит.
3. Props оркестратора типизированы как `any` — сужать типы постепенно.
4. Часть UI-строк без i18n (секция изображений и кроппер уже на `t()`).
5. Устаревшие локальные заметки `ANALYSIS.md` / `IMPROVEMENTS_SUMMARY.md` / старый README описывают состояние **до** разбиения на хуки — ориентироваться на этот документ и код.
6. Кроппер фото: см. [`CROPPER_IMPLEMENTATION_REPORT.md`](./CROPPER_IMPLEMENTATION_REPORT.md) — **нет ручной проверки на реальных iPhone/Android JPEG с EXIF** (релиз-блокер для продакшена до QA).

---

## 19. Чеклист изменения экрана

- [ ] Create + edit + (если трогали) scan / embedded из прихода
- [ ] Товар / услуга / комплект
- [ ] Весовой + PLU, 18+, alternate barcodes, упаковки, акция
- [ ] Раскладка: скрыть блок → сохранить → перезагрузка; edit с заполненным скрытым полем всё ещё показывает блок
- [ ] Картинки: add / remove / primary
- [ ] Долг + расход кассы (если сценарий)
- [ ] `npm run lint` / `typecheck` / релевантные тесты
- [ ] При смене API — обновить `docs/flutter/add-product.md` и `docs/backend/*`

---

*При расхождении с кодом приоритет у кода. Для контракта полей и мобильного паритета — `docs/flutter/add-product.md`.*
