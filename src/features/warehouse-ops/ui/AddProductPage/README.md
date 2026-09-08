# AddProductPage

Экран **создания и редактирования товара** склада NurCRM Market.

| | |
|---|---|
| Оркестратор | `../AddProductPage.tsx` |
| Модуль | эта папка |
| Маршруты | `/crm/sklad/add-product`, `/crm/sklad/add-product/:id` |
| Public API | `@features/add-product` |

## Полная документация

**Читать здесь:** [`docs/market/add-product-page.md`](../../../../../docs/market/add-product-page.md)

Паритет полей/API для мобильного клиента: [`docs/flutter/add-product.md`](../../../../../docs/flutter/add-product.md)  
Раскладка формы (BE): [`docs/backend/product-form-layout-backend.md`](../../../../../docs/backend/product-form-layout-backend.md)  
Карта проекта: [`docs/PROJECT.md`](../../../../../docs/PROJECT.md)

## Структура (актуально)

```
AddProductPage.tsx              # оркестратор (тонкий)
AddProductPage/
├── constants.ts
├── utils/                      # barcode, debt, product payload, kit picker
├── hooks/
│   ├── useAddProductPage.ts    # фасад состояния
│   ├── useAddProductBootstrap.ts
│   ├── useAddProductSubmitFlow.ts
│   ├── useMarketProductState.ts
│   ├── useProductImages.ts
│   ├── useDebtForm.ts
│   ├── useSupplierForm.ts
│   └── useBrandCategoryDict.ts …
├── formLayout/                 # скрываемые блоки формы (company layout)
├── components/
│   ├── MarketProductForm.tsx   # основная форма
│   ├── ManualEntryForm.tsx     # legacy
│   └── sections/ …
└── (скан) ../AddProductBarcode/
```

## Быстрый старт для правок

| Задача | Файл |
|--------|------|
| UI формы | `components/MarketProductForm.tsx`, `components/sections/` |
| Payload / валидация | `utils/productUtils.ts` |
| Submit | `hooks/useAddProductSubmitFlow.ts` |
| Загрузка edit / автокоды | `hooks/useAddProductBootstrap.ts` |
| Раскладка полей | `formLayout/` |
| Embedded из прихода | props в `AddProductPage.tsx` + `SupplierReceiptModals` |

Устаревшие заметки `ANALYSIS.md` / `IMPROVEMENTS_SUMMARY.md` отражают состояние до рефакторинга на хуки — не считать источником правды.
