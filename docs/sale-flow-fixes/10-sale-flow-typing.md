# Исправление: типизация потока продажи

**Баг:** [sale-flow-bugs.md, пункт 10](../sale-flow-bugs.md#10--типизация-продажи-ослаблена-почти-везде--anyиндекс-сигнатуры-вместо-конкретных-типов)
**Нужен бэк:** нет — но бэку стоит формально зафиксировать контракт ответа `/main/pos/sales/`, на который фронт будет опираться при типизации (см. раздел 4)
**Приоритет:** 🟡 средний, большой объём — делать постепенно

---

## 1. Проблема (см. полное описание в баге 10)

28 thunk'ов в `saleThunk.ts` — `createAsyncThunk<any, void | any>`. `useSale()` возвращает `any`. Канонического типа `Sale`/`SaleItem`/`PosCart` в репозитории нет вообще. Отсюда — баги 3, 5, 9 из этого же списка: поля забываются/путаются, компилятор не может подсказать.

## 2. План — по шагам, не одним большим рефакторингом

### Шаг 1. Завести канонические типы в `entities/sale`

Новый файл `src/entities/sale/model/types.ts`:

```ts
export type PosSaleStatus = "new" | "paid" | "debt" | "partially_returned" | "canceled";

export type PosSaleItem = {
  id: string;
  product?: string | null;
  product_id?: string | null;       // алиас, бэк отдаёт то одно, то другое поле — задокументировать оба
  quantity: string | number;
  unit_price?: string | number;
  price?: string | number;          // алиас unit_price
  line_discount?: string | number;
  discount_total?: string | number; // алиас line_discount
  sale_package?: string | number | null;
  sale_package_id?: string | number | null; // алиас
  product_name?: string;
  display_name?: string;
  name?: string;
  unit?: string;
  is_weight?: boolean;
  promotion_rules?: unknown[];
  primary_image_url?: string | null;
  images?: { image_url?: string }[];
};

export type PosSale = {
  id: string;
  number?: number;
  status: PosSaleStatus | string;   // string — на случай нового статуса с бэка, которого фронт ещё не знает
  shift?: string | { id?: string } | null;
  shift_id?: string | null;
  cashbox?: string | null;
  branch?: string | null;
  client?: string | null;
  client_name?: string | null;
  subtotal?: string;
  discount_total?: string;
  tax_total?: string;
  total?: string;
  order_discount_total?: string | number;
  order_discount_percent?: string | number;
  payment_method?: string;
  cash_received?: string;
  change?: string;
  debt_amount?: number | string;
  is_wholesale?: boolean;
  is_default?: boolean;
  items?: PosSaleItem[];
  cart?: { items?: PosSaleItem[] };
  created_at?: string;
  paid_at?: string | null;
  consultant?: string | null;
  consultant_commission_percent?: string | null;
};

export type PosCartTab = {
  saleId: string;
  label: string;
  isMain: boolean;
  itemCount: number;
  total: string | number | null;
  status: string;
};
```

**Важно:** комментариями прямо в типе задокументировать, какое поле — «основное», а какое — «алиас на случай другой версии бэка» (как в примере выше). Это формализует то, что сейчас разбросано по всему коду как `item.unit_price || item.price`.

### Шаг 2. Типизировать `posSaleCarts.ts`

`src/shared/lib/tools/posSaleCarts.ts` — 21 место с `any`. Начать с сигнатур публичных функций, оставляя внутренности гибкими, где реально нужна защита от разных форматов ответа:

```ts
export const normalizePosStartResponse = (
  data: unknown,
): { sale: PosSale | null; carts: PosCartTab[]; activeSaleId: string | null } => { ... }

export const applyPosStartToState = (state: SaleState, data: unknown): void => { ... }
```

(`SaleState` — тип стейта слайса, см. шаг 3). Внутри функций можно оставить точечные `as any`/`Record<string, unknown>` там, где реально приходится разбирать неизвестную структуру ответа — но **вход и выход** функции должны быть типизированы, чтобы вызывающий код получал проверку.

### Шаг 3. Типизировать `saleSlice.ts`

```ts
export type SaleState = {
  start: PosSale | null;
  posCarts: PosCartTab[];
  activeSaleId: string | null;
  loading: boolean;
  startSaleLoading: boolean;
  cart: unknown | null;   // ответ PATCH/add-item — отдельная тема, см. шаг 5
  error: { message?: string } | null;
  history: PosSale[];
  historyCount: number;
  // ...
};

const initialState: SaleState = {
  start: null,
  posCarts: [],
  activeSaleId: null,
  loading: false,
  startSaleLoading: false,
  cart: null,
  error: null,
  history: [],
  historyCount: 0,
  // ...
};
```

И типизировать сам хук:
```ts
import type { RootState } from "@app/store"; // свериться с реальным путём типа стора
export const useSale = () => useSelector((state: RootState) => state.sale);
```

Это единственное изменение из всего списка, которое сразу «зажжёт красным» десятки мест по всему проекту, где сейчас на `any` полагались неявно — ожидаемо, чинить постепенно, по файлу за раз, не одним PR.

### Шаг 4. Типизировать thunk'и — начать с денежных

Приоритет — те, где уже нашли реальные баги из-за `any`:

```ts
export const productCheckout = createAsyncThunk<
  PosSale,
  {
    id: string;
    bool: boolean;
    clientId?: string | null;
    payment_method?: string | null;
    payments?: { method: string; amount: string }[] | null;
    cash_received?: string | number | null;
    branch_id?: string;
    shift_id?: string;
    cashbox_role?: string;
    consultant_id?: string;
    consultant_commission_enabled?: boolean;
    consultant_commission_percent?: string;
    schedule_version?: "v1" | "v2";
    debt_schedule?: unknown;
  }
>("products/productCheckout", async (args, { rejectWithValue }) => { ... });

export const returnSale = createAsyncThunk<
  PosSale,
  {
    saleId: string;
    items?: { sale_item_id: string | number; quantity: number }[];
    is_defect?: boolean;
    shiftId?: string;        // ← теперь обязательно видно в типе, что поле существует
    idempotencyKey?: string;
  }
>("products/returnSale", async (args, { rejectWithValue, getState }) => { ... });
```

С таким типом `returnSale({ saleId, items, idempotencyKey })` — TypeScript ничего не скажет, что `shiftId` не передан (поле опциональное), но по крайней мере разработчик его **увидит** в автодополнении при вызове, чего сейчас нет вообще при `any`. Если хочется жёстче — сделать `shiftId` обязательным полем (не `?`), тогда все вызывающие места без него подсветятся ошибкой компиляции, что как раз and would have caught bug 5 automatically.

Дальше по одному thunk'у: `createDeal`, `startSale`, `manualFilling`, `updateProductInCart`, `deleteProductInCart`, `sendBarCode` — оставшиеся 22.

### Шаг 5. Единый `Money`-хелпер

`src/shared/lib/tools/money.ts` (новый файл):

```ts
export function toMoney(value: string | number | null | undefined): number {
  if (value == null || value === "") return NaN; // явный NaN — не 0, чтобы не путать "нет данных" с "ноль"
  const n = typeof value === "number" ? value : parseFloat(value);
  return n;
}

export function toMoneyOrZero(value: string | number | null | undefined): number {
  const n = toMoney(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: string | number | null | undefined): string {
  const n = toMoneyOrZero(value);
  return n.toFixed(2);
}
```

Ключевая идея: `toMoney` возвращает `NaN`, а не `0`, когда данных нет — вызывающий код обязан явно решить, что делать с отсутствием данных (`Number.isFinite(n) ? n : fallback`), вместо того чтобы `0`/`""` тихо превращались в ложный `0` через `||` (ровно баг 3). Использовать этот хелпер вместо разрозненных `parseFloat`/`Number`/`.toFixed(2)` по всему потоку продажи, начиная с мест, где уже находили баги (`useCashierUi.ts`, `useCashierProducts.ts` — discount-логика).

### Шаг 6. Объединить `AlertModalState`

Два разных определения — `src/pages/cashier/ui/cashierPage.types.ts` (с `onConfirm?/onClose?`) и `src/pages/cashier/ui/paymentPage.types.ts` (без них). Перенести единое определение в `src/shared/ui/AlertModal/AlertModal.types.ts`, реэкспортировать из обоих feature-файлов:

```ts
// shared/ui/AlertModal/AlertModal.types.ts
export type AlertModalState = {
  open: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  okText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
};
```

## 3. Порядок и риски

- Делать по одному шагу за PR — типизация `useSale()`/`saleSlice.ts` (шаг 3) — самая рискованная по объёму последствий (много красных мест), делать отдельным PR с прогоном полного тайпчека и ручным regression-тестом кассы.
- Не пытаться типизировать всё сразу «одним махом» — 28 thunk'ов, десятки потребителей `currentSale` — реалистично по 2-3 thunk'а за итерацию, начиная с тех, что уже фигурируют в найденных багах (checkout, return, createDeal, startSale, manualFilling).
- После каждого шага — прогон `tsc --noEmit` и существующих unit-тестов (`buildDebtSchedule.test.ts`, `saleConsultant.test.ts`, `cashierPage.utils.test.ts` и др.) — они не должны сломаться от одной только типизации, если типы описаны верно.

## 4. Что желательно от бэка (не блокер)

Формальная OpenAPI/Swagger-схема (или хотя бы явный список полей с типами в документации) для `GET/POST /main/pos/sales/...` — сейчас типы на фронте пишутся по наблюдаемым в devtools ответам, а не по контракту. Если у бэка уже есть OpenAPI-схема — сверить с ней при написании `PosSale`/`PosSaleItem` в шаге 1, это сильно снизит риск разойтись с реальным форматом ответа.

## 5. Статус

Только спроектировано, код не менялся.
