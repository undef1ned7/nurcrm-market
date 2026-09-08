# Печать чека (POS / ESC/POS)

Документ описывает, как фронт NurCRM Market печатает кассовый чек: от экрана оплаты до байтов на термопринтере. Не путать с печатью **штрихкодов** (`@features/print-barcode`, XP-365B) и с **приходными накладными** склада.

**Статус:** актуально для `src/pages/sell/ui/services/print*` и кассы `/crm/market/cashier`.

Смежные документы:

- Контракт JSON и скидки: [`docs/backend/receipt-price-edit-discount.md`](../backend/receipt-price-edit-discount.md)
- Флаг ручной цены: [`docs/backend/receipt-price-override-flag.md`](../backend/receipt-price-override-flag.md)
- Match eKassa items: [`docs/backend/receipt-ekassa-item-matching.md`](../backend/receipt-ekassa-item-matching.md)
- Отчёт по рискам печати: [`docs/market/print-receipt-fixes-report.md`](./print-receipt-fixes-report.md)
- Денежный ящик (ТЗ): [`docs/market/tz-aug-2026-detailed.md`](./tz-aug-2026-detailed.md) модуль 5
- Карта проекта: [`docs/PROJECT.md`](../PROJECT.md) §9 «Печать / ESC-POS»

---

## 1. Коротко

Чек **не печатается через системный диалог Windows/macOS**. Браузер (Chrome / Edge) берёт USB-принтер через **WebUSB**, собирает **ESC/POS**-байты и шлёт их на bulk OUT endpoint.

Два пути данных:

1. **JSON** (основной) — `GET /main/sales/json/{sale_id}/receipt/` или payload checkout → `buildReceiptFromJSON` → текстовый чек + QR eKassa.
2. **PDF** (фолбэк) — `GET /main/pos/sales/{id}/receipt/` как blob → **локальный** `pdfjs-dist` (ленивый import, worker с того же origin) растеризует первую страницу → команда `GS v 0` (растр).

Настройки ширины бумаги, шрифта, кодовой страницы и ящика живут **только в `localStorage` этого браузера** (`escpos_*`). Они не уезжают на бэкенд.

---

## 2. Архитектура

```
Касса / legacy sell / документы
        │
        ▼
  payload: JSON | Blob | nested {receipt, data, …}
        │
        ▼
handleCheckoutResponseForPrinting()     print/print.ts
        │
        ├─ withCashDrawerKick()         до или после печати
        ▼
printCheckoutPayload()
        │
        ├─ unwrapPrintablePayload()     print/detect.ts
        ├─ JSON + items[]  ──────────► printReceiptJSONViaUSB
        │                                    │
        │                                    ▼
        │                              buildReceiptFromJSON     print/formatters.ts
        │                                    │
        │                                    ▼
        │                              encoder (CP866/1251)     print/encoding.ts
        │
        └─ PDF blob / data:pdf;base64 ─► printReceiptFromPdfUSB
                                             │
                                             ▼
                                       pdf.js → canvas → raster  print/raster.ts
        │
        ▼
sendEscPosBytes()  chunk 12 KiB  ──► USB transferOut            print/usb.ts
```

Публичный barrel: `src/pages/sell/ui/services/printService.ts`. Реализация разнесена по `src/pages/sell/ui/services/print/`.

| Файл | Роль |
|------|------|
| `print.ts` | Оркестрация: USB, JSON/PDF, ящик, `enrichMarketReceiptPayload` |
| `formatters.ts` | Раскладка чека, скидки, eKassa-поля, QR, cut |
| `encoding.ts` | Code page + энкодер кириллицы, `getEscposRuntimeConfig` |
| `usb.ts` | WebUSB: выбор устройства, claim interface, auto-reconnect |
| `detect.ts` | Распознать JSON / PDF / data-URL, развернуть вложенный ответ |
| `raster.ts` | PDF → монохромный растр ESC/POS |
| `drawer.ts` | Kick денежного ящика (`ESC p`) |
| `storage.ts` | `localStorage` ключи ширины/шрифта/CP |
| `bytes.ts` | `ESC(...)`, нарезка буфера по 12 KiB |

---

## 3. Транспорт: WebUSB

### Требования среды

- Браузер с WebUSB: **Chrome / Edge / Chromium**. Safari и Firefox — нет.
- Контекст: **localhost** или **HTTPS**. На HTTP-хосте `navigator.usb` недоступен.
- Первое подключение: жест пользователя (`requestDevice`). Дальше устройство в списке `getDevices()`.
- Windows: принтер часто виден как Printer class. Чтобы браузер смог `claimInterface`, нужен **WinUSB** (Zadig). Пока драйвер — системный spooler, WebUSB падает с текстом про bulk OUT.

Фильтры выбора устройства (`usb.ts`): USB class `0x07` (Printer) или `0xFF` (vendor).

### Состояние устройства

Глобальный `usbState = { dev, opening }` в модуле `usb.ts` — один принтер на вкладку.

Сохраняется в `localStorage`:

| Ключ | Смысл |
|------|--------|
| `escpos_vid` / `escpos_pid` | hex vendor/product id |
| `escpos_serial` | если есть — приоритет при auto-connect |
| `escpos_product` / `escpos_manufacturer` | только для UI/диагностики |

Автоподключение: `getDevices()` → совпадение serial, иначе VID+PID → `open` → `claimInterface` с bulk OUT.

Слушатели `connect` / `disconnect` вешаются один раз (`attachUsbListenersOnce`). На кассе legacy sell хук `useSellMainStartPrinter` ещё опрашивает `checkPrinterConnection` каждые 2 с.

### Интерактив vs тихий режим

```ts
ensureUsbPrinter({ interactive: false }) // нет picker — throw «Принтер не подключен»
ensurePrinterConnectedInteractively()    // auto, иначе диалог выбора
```

Касса (`printReceiptSmart`) сначала печатает тихо; при ошибке открывает picker и повторяет.

### Отправка

`transferOut(outEP, chunk)` чанками **12 КиБ** (`chunkBytes`). Большой растр PDF иначе рвёт стек USB.

---

## 4. Настройки ESC/POS (`localStorage`)

UI: `/crm/pos-print-settings` → `PosPrintSettings.tsx`.

| Ключ | Default | Назначение |
|------|---------|------------|
| `escpos_dpl` | 576 (80 мм) или **384 для market**, если ширина не задана | точек по ширине (растр PDF) |
| `escpos_cpl` | `dpl / 9` (font B) или **42 для market** | символов в строке текстового чека |
| `escpos_font` | `B` | A = ~12 точек/символ, B = ~9 |
| `escpos_line` | 22 (B) / 24 (A) | межстрочный (для растра/конфига; текстовый чек в основном `\n`) |
| `escpos_cp` | **17** (PC866) | `ESC t n` |

Пресеты ширины бумаги: 80 мм → 576, 58 → 384, 44 → 320, 38 → 288 точек.

Если ни `escpos_dpl`, ни `escpos_cpl` нет, и печать идёт со стилем `market`, берутся **58 мм / 42 символа**. После сохранения настроек в UI market-дефолты больше не подставляются (`hasEscposWidthSettings`).

Стиль `market` также включается автоматически, если `localStorage.selectedSector === "market"` и в опциях не передан `receiptStyle`.

### Кодовые страницы

Энкодер выбирается по номеру `escpos_cp`:

| Номера | Кодировка |
|--------|-----------|
| 17, 18, 59, 66 | PC866 (кириллица в байтах 0x80+) |
| 73, 22 | Windows-1251 |
| 255 | PC936 — не-ASCII заменяются на `?` |
| всё остальное | fallback CP1251 |

На принтер уходит `ESC @` (init), `ESC R 0` (international **USA**, не Spain — иначе ломаются `\|[]`), затем `ESC t n`.

Кракозябры: переключить **17 ↔ 66** (разный индекс PC866 у Xprinter, в т.ч. XP-N160II) или PC866 ↔ CP1251. Тест: кнопка «Тест USB» печатает `ТЕСТ: Привет, мир! Ёё № 123`.

---

## 5. Денежный ящик

Импульс 5 V идёт **через принтер** (пин RJ11/RJ12 на корпусе), не отдельным USB.

| Ключ | Значения |
|------|----------|
| `escpos_drawer_enabled` | `"1"` = открывать при каждой печати через `handleCheckoutResponseForPrinting` |
| `escpos_drawer_when` | `before` \| `after` (по умолчанию after) |
| `escpos_drawer_cmd` | байты через запятую |

Команда по умолчанию: `27, 112, 0, 25, 250` = `ESC p 0 25 250` (Epson-совместимый kick pin 2).

Разбор: `parseEscPosCommand` (десятичные или `0x..`). Тесты: `print/drawer.test.ts`.

Поведение:

1. Ящик выключен → только печать.
2. `before` → kick → печать. Если печать упала, kick уже мог сработать — так задумано.
3. `after` → печать → kick.
4. Ошибка kick **логируется** (`console.warn`) и **не отменяет** продажу и (при `after`) уже напечатанный чек.

Публичный API: `kickCashDrawer(bytes?, options?)`. Кнопка «Проверить открывание ящика» на настройках шлёт только kick, без чека.

---

## 6. Откуда берётся содержимое чека

### 6.1. Касса маркета (`/crm/market/cashier`)

Файл: `src/pages/cashier/ui/hooks/usePaymentPage.ts`.

1. Чекбокс «Без чека» (`withoutCheck` / `market_withoutCheck` в `localStorage`). Если включён — WebUSB не трогают, `print_receipt` на checkout = false.
2. Иначе: `checkPrinterConnection` → при необходимости `ensurePrinterConnectedInteractively`.
3. `POST /main/pos/sales/{id}/checkout/` с `print_receipt: isPrinterConnected` (флаг для бэка/фискализации, печать делает фронт).
4. Ответ checkout обогащается `enrichMarketReceiptPayload` (нал, сдача, consultant):
   - cash: `paid_cash`, `cash_received`, `change`
   - split: нал + безнал
   - cashless: `paid_card`
   - deferred + предоплата: `paid_cash` = предоплата
5. `printReceiptSmart(payload)` → `handleCheckoutResponseForPrinting(..., { interactive: false, receiptStyle: "market" })`.
6. Если JSON не печатается — фолбэк `GET /main/pos/sales/{id}/receipt/` (blob).
7. Модалка успеха хранит payload; кнопка «Печать» повторяет `printReceiptSmart`.

Продажа **всегда проводится**, даже если печать упала — только warning.

### 6.2. Legacy sell (`/crm/sell`)

`useSellMainStartCheckout.performCheckout`:

1. Checkout с `print_receipt: withReceipt` (модалка «с чеком / без»).
2. Если `withReceipt` и есть `sale_id`: сначала `GET /main/sales/json/{id}/receipt/`, при ошибке blob `GET /main/pos/sales/{id}/receipt/`.
3. Долг / предоплата: confirm «Напечатать чек?» после сохранения.

`SellDetail` / `SellModal`: повторная печать через `getProductCheckout` (blob).

### 6.3. Документы и превью

| Экран | Данные | Печать |
|-------|--------|--------|
| Документы, список | `getReceiptJson` | маппинг `items` + totals → `receiptStyle: "market"` |
| `ReceiptPreviewModal` (касса) | JSON API | урезанный маппинг позиций; проверяет USB заранее |
| `ReceiptPreviewModal` (документы) | JSON | полный маппинг скидок + **скачать PDF** через `@react-pdf/renderer` (`ReceiptPdfDocument`) — это **не** ESC/POS |

`GET /main/sales/json/{id}/receipt/` — канонический JSON для превью и документов.

### 6.4. API

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/main/pos/sales/{id}/checkout/` | Закрытие продажи. Тело: `print_receipt`, `payment_method` / `payments[]`, `cash_received`, consultant, долг |
| GET | `/main/sales/json/{id}/receipt/` | JSON чека (предпочтительно) |
| GET | `/main/pos/sales/{id}/receipt/` | Blob: PDF или JSON в теле |

Thunks: `productCheckout`, `getReceiptJson`, `getProductCheckout` в `@entities/sale`.

---

## 7. Разбор payload (`detect.ts`)

`unwrapPrintablePayload` рекурсивно (глубина ≤ 3) смотрит:

`receipt` → `checkoutResponse` → `payload` → `data` → `result` → `response` → `body`

Успех, если найден `Blob`, строка или объект с массивом `items`.

Дальше `printCheckoutPayload`:

1. Строка `data:application/pdf;base64,...` → PDF-ветка.
2. Строка, парсится как JSON с `items[]` → JSON-ветка.
3. Объект с `items[]` → JSON.
4. Blob: магические байты `%PDF-` → PDF; иначе текст как JSON; иначе data-URL PDF.
5. Неопознанный blob: скачивается как `receipt.pdf` и бросается ошибка.

---

## 8. Текстовый чек (`buildReceiptFromJSON`)

### Стиль `market` vs обычный

`receiptStyle: "market"`:

- шапка «СПАСИБО ЗА ПОКУПКУ!»
- позиции: `N) название` (перенос по словам), затем строка `Цена x Кол-о [- скидка]` / `Итого`
- полужирный + чуть крупный шрифт (`ESC ! 0x08`)
- итог крупный пропорционально (`ESC ! 0x30`, двойная ширина/высота)
- минимальная ширина строки 32 символа

Обычный стиль: `N. название`, строка `цена x qty ед.`, скидка отдельной строкой.

### Поля JSON (без eKassa)

Позиции берутся из `items` | `receipt.items` | `cart.items`.

На строке (`mapMarketReceiptItem`):

- имя: `name` / `product_name`
- qty: `qty` / `quantity`
- цена: `unit_price` / `price`
- скидка строки: `line_discount` / `discount_total` / `line_discount_total`
- если скидки нет, но `line_total` < цена×qty — скидка **выводится** как разница (защита от кривого бэка)
- сумма строки: `line_total` иначе цена×qty − скидка

Итоги:

```
Подытог = Σ(line_total + line_discount)     // вал до скидок, без двойного вычета
Скидка  = payload.discount | order_discount_total | order_discount
Итог    = max(0, Подытог − Скидка + НДС)
```

Если есть блок eKassa, **скидка заказа с payload не печатается** (`resolveMarketOrderDiscount` → 0): суммы уже в фискальных полях.

Оплата: `paid_cash`, `paid_card`, `cash_received` (если больше paid_cash — строка «Получено»), `change`.

Шапка: `company`, `inn`, `address`, `cashier_name`, консультант (`consultant_name` / `consultant_display` / `consultant.name`), `doc_no`, `created_at`.

### eKassa (фискальный слой)

Ищутся поля:

`ekassa_fiscal.fields` | `ekassa.fields` | `ekassa.ekassa_payload.data.fields`

Денежные теги в **тыйынах** (`/ 100`):

| Тег | Смысл |
|-----|--------|
| 1042 | номер документа |
| 1012 | дата/время |
| 1038 | смена |
| 1059 | позиции: 1030 имя, 1023 qty, 1076 цена, 1043 сумма |
| 1020 | подытог |
| 1033 | НДС |
| 1215 | НсП |
| 1031 | итог |
| 1081 | безнал |
| 1037 | РН ККМ |
| 1041 | ФМ |
| 1040 | ФД |
| 1077 | ФПД |

Позиции eKassa **мержатся** с `payload.items` по индексу, иначе по имени+qty — чтобы на фискальном чеке остались построчные скидки маркета.

Дополнительно на бумаге при наличии fields: СНО «Общий налоговый режим», «Вид расчета / Полный расчет», НДС/НсП 0%, «ККМ версия 1.0».

QR: `ekassa_fiscal.link` или `ekassa.link` → `GS ( k` (QR model 2, ECC M, module 6), подпись «Проверка чека».

Реквизиты ККТ без fields тоже читаются с `ekassa_fiscal.kkm_reg_number` / `fm_number` / `fd_number` / `fpd`.

### Завершение

`ESC d 6` (прогон 6 строк) + `GS V 0` (полный отрез).

---

## 9. PDF-ветка

`raster.ts` грузит pdf.js 3.11.174 с cdnjs (нужен интернет при первом PDF-чеке).

Первая страница масштабируется к `dotsPerLine`. Пиксели темнее порога 180 → бит в растре. Команда `GS v 0` (растр), затем feed 1 строка + full cut.

Качество хуже текстового ESC/POS; это запасной путь, если бэк отдаёт PDF.

---

## 10. Обогащение payload на кассе

`enrichMarketReceiptPayload(payload, meta)` не ломает не-объекты. Для наличных проставляет `payment_method`, `cash_received`, `paid_cash`, `change`. Карта — `paid_card`. Консультант нормализуется в `consultant_name`.

Нужен, потому что checkout-ответ часто без сдачи, а кассир ввёл «получено».

---

## 11. Что это не покрывает

| Тема | Где |
|------|-----|
| Этикетки штрихкодов | `xp365bPrintService`, `/crm/barcodes` |
| Cafe kitchen / Wi‑Fi 9100 | `tools/printer-bridge.mjs` + stub `OrdersPrintService.ts`. **Market POS bridge не использует.** `npm run printer-bridge` — HTTP `POST /print` `{ ip, port, data: base64 }` → TCP 9100 |
| Настройки кафе в Settings → Печать | `PrintTab` только для cafe-сектора; маркет ходит в `/crm/pos-print-settings` |
| Фискальный коннектор cafe | `useFiscalSettings` → `/cafe/fiscal/settings/` |
| Системная печать PDF из документов | `ReceiptPdfDocument` + download |

---

## 12. Типичные сбои

| Симптом | Что проверить |
|---------|----------------|
| «WebUSB не поддерживается» | не Chrome; не HTTPS/localhost |
| «Принтер не подключен» | нет разрешения; `interactive: false` |
| claimInterface / bulk OUT | Windows: Zadig WinUSB; закрыть родное ПО принтера |
| Кракозябры | `escpos_cp` 17↔66 или 866↔1251 |
| Чек обрезан по ширине | `escpos_dpl` / `escpos_cpl`, пресет 58 vs 80 мм |
| Итог меньше оплаты при смене цены | бэк кладёт разницу цен в `discount` — см. receipt-price-edit-discount; фронт считает Подытог как Σ(line_total + line_discount) |
| Ящик не открывается | тумблер, кабель RJ, команда `ESC p`, тест кнопкой |
| PDF не печатается | CDN pdf.js заблокирован; blob не `%PDF-` |
| Повторная печать из документов без скидок | список документов мапит `price`/`total` без `line_discount` / `unit_price` — превью-модалка документов мапит полнее |

Продажа и печать развязаны: ошибка USB не откатывает checkout.

---

## 13. Как править чек безопасно

1. Раскладка и суммы — `formatters.ts` (`buildReceiptFromJSON`). Не дублировать математику в каждом модальном превью без нужды.
2. Новые поля API — добавить в маппинг позиций и в `enrichMarketReceiptPayload`, если касса их знает раньше JSON.
3. Не тащить cafe `printer-bridge` в market POS без отдельной задачи: касса рассчитана на WebUSB.
4. Тесты: логика байтов ящика уже есть; для скидок/итогов лучше vitest рядом с `formatters.ts`.
5. Тяжёлый `@react-pdf` не подключать в горячий путь кассы — только документы / download.

---

## 14. Чеклист ручной проверки

- [ ] Chrome, HTTPS или localhost, Zadig на Windows.
- [ ] `/crm/pos-print-settings`: тест USB (кириллица), тест ящика.
- [ ] Касса: нал со сдачей, безнал, split, долг; «Без чека».
- [ ] Повторная печать из модалки успеха и из документов.
- [ ] Скидка на строку и на заказ: Подытог − Скидка = Итог = оплата.
- [ ] Ручная смена цены **без** скидки: на чеке нет фантомной скидки (если бэк исправлен).
- [ ] Если есть eKassa: QR, РН/ФМ/ФД/ФПД, суммы в сомах (не тыйыны).
- [ ] Ящик: off / before / after; ошибка kick не ломает продажу.
