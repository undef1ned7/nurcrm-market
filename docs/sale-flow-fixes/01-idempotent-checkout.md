# Исправление: идемпотентность `checkout` / `startSale` (двойная продажа/оплата)

**Баг:** [sale-flow-bugs.md, пункт 1](../sale-flow-bugs.md#1--двойная-продажадвойная-оплата--общая-корзина-вебмобилка-без-идемпотентности-чекаута)
**Нужен бэк:** да, обязательно
**Приоритет:** 🔴 критично — прямой риск двойного списания денег/склада

---

## 1. Проблема

Веб и мобилка используют одну апишку и один аккаунт кассира. Активная корзина резолвится по `shift_id`, а не по устройству — `POST /main/pos/sales/start/` с одинаковым `shift` с двух устройств вернёт **один и тот же `sale.id`**. Если оба устройства (или ретрай после обрыва сети/таймаута) отправят `checkout` на этот `sale.id` почти одновременно, ничто не мешает бэку обработать их как два независимых события: два списания склада, два платежа, два cashflow.

Сейчас `productCheckout` и `startSale` не передают вообще никакого признака «это повтор той же попытки, а не новая». `payingInFlightRef` на фронте (`src/pages/cashier/ui/hooks/usePaymentPage.ts:432`) защищает только один браузерный таб — второе устройство или React-стейт после `reload` об этом флаге ничего не знает.

## 2. Что должен сделать бэкенд

### 2.1. Контракт

Добавить поддержку заголовка идемпотентности на две ручки:

```
POST /main/pos/sales/{id}/checkout/
POST /main/pos/sales/start/
```

**Заголовок запроса** (предпочтительно, не тело — чтобы не путать с бизнес-полями):

```
Idempotency-Key: <строка, до 255 символов, сгенерирована клиентом>
```

Если бэку удобнее в теле — альтернативно можно принимать `idempotency_key` в JSON-теле (как уже сделано для `POST /pos/sales/{id}/return/`, см. `saleReturn.ts` — там ровно это поле, тот же паттерн, просто примени его и к checkout/start).

### 2.2. Алгоритм на бэке

```python
def checkout(request, sale_id):
    idem_key = request.headers.get("Idempotency-Key") or request.data.get("idempotency_key")

    if idem_key:
        existing = IdempotencyRecord.objects.filter(
            key=idem_key,
            endpoint="pos_sale_checkout",
            company=request.user.company,
        ).first()
        if existing:
            # Тот же запрос уже обрабатывался (или обрабатывается) — отдать
            # сохранённый результат вместо повторной бизнес-логики.
            if existing.status == "completed":
                return Response(existing.response_body, status=existing.response_status)
            if existing.status == "in_progress":
                # Второй запрос пришёл, пока первый ещё не завершился (гонка
                # двух устройств почти одновременно) — вернуть 409, фронт
                # покажет «обрабатывается, подождите» вместо второй попытки.
                return Response({"detail": "Запрос уже обрабатывается"}, status=409)

        IdempotencyRecord.objects.create(
            key=idem_key,
            endpoint="pos_sale_checkout",
            company=request.user.company,
            status="in_progress",
        )

    try:
        result = do_checkout_business_logic(sale_id, request.data)  # существующая логика, без изменений
    except Exception:
        if idem_key:
            IdempotencyRecord.objects.filter(key=idem_key, endpoint="pos_sale_checkout").delete()
            # ошибка — ключ не занят навсегда, ретрай с тем же ключом должен
            # снова попытаться выполнить операцию, а не вернуть кэш ошибки
        raise

    if idem_key:
        IdempotencyRecord.objects.filter(key=idem_key, endpoint="pos_sale_checkout").update(
            status="completed",
            response_body=result.data,
            response_status=result.status_code,
        )

    return result
```

Ключевые моменты для бэка:
- **Ключ уникален в рамках `(company, endpoint, key)`** — не глобально, чтобы разные компании не могли случайно столкнуться значениями.
- **Успешный результат кэшируется и отдаётся повторно** при точном совпадении ключа — никакой повторной бизнес-логики, значит никакого повторного списания.
- **Ошибочный результат ключ не занимает** — если `checkout` упал (400/500), при ретрае с тем же ключом нужно реально повторить попытку, а не вернуть закэшированную ошибку. Это важно: сетевой таймаут ≠ бизнес-ошибка, и фронт должен иметь возможность повторить настоящую попытку после исправления проблемы (например, после того как истёк лимит скидки).
- **`in_progress` → 409**, если два запроса с одним ключом пришли одновременно (до того как первый успел записать `completed`) — фронт должен трактовать 409 как «подождать и не считать ошибкой», не как повод ретраить немедленно.
- Время жизни записи — минимум 24 часа (одна смена может быть длиннее), можно чистить по TTL джобой.

То же самое для `POST /pos/sales/start/` — там риск в том, что при гонке (два устройства почти одновременно стартуют новую корзину на одну смену) можно случайно создать **две** параллельные активные корзины вместо одной, и они разойдутся. Идемпотентность здесь работает так же: один и тот же клиентский ключ → одна и та же созданная (или переиспользованная) корзина.

### 2.3. Критерии приёмки (бэк)

- [ ] Повторный `POST /checkout/` с тем же `Idempotency-Key` и тем же `sale_id` → возвращает тот же `201`/тело, **не** создаёт второй платёж/cashflow/списание склада.
- [ ] Повторный `POST /checkout/` с тем же ключом, но после того как первый запрос упал с ошибкой (400) — реально повторяет попытку, не отдаёт закэшированную ошибку.
- [ ] Два одновременных запроса с одним ключом (гонка) — один получает `201` с реальным результатом, второй — `409` (не дублирует бизнес-логику).
- [ ] Разные ключи на один и тот же `sale_id` — оба обрабатываются как отдельные (это ожидаемо: значит это разные попытки/операции, а не дубли).
- [ ] `POST /pos/sales/start/` с одним и тем же ключом от одной смены не создаёт вторую параллельную корзину.

## 3. Что делает фронт

### 3.1. Генерация ключа

В `src/pages/cashier/ui/hooks/usePaymentPage.ts`, рядом с `payingInFlightRef`, завести стабильный ключ на **одну попытку оплаты**, который переживает ретраи, но обнуляется, если реально поменялся интент (сумма/способ оплаты/состав корзины):

```ts
// usePaymentPage.ts
const checkoutIdempotencyRef = useRef<{ signature: string; key: string } | null>(null);

function buildCheckoutSignature(args: {
  saleId: string;
  paymentMethod: string;
  total: number;
  cashReceived: string | number | null;
}): string {
  return [args.saleId, args.paymentMethod, args.total, args.cashReceived ?? ""].join("|");
}

// перед dispatch(productCheckout(...)):
const signature = buildCheckoutSignature({ saleId, paymentMethod, total, cashReceived: checkoutCashReceived });
if (checkoutIdempotencyRef.current?.signature !== signature) {
  checkoutIdempotencyRef.current = {
    signature,
    key: crypto.randomUUID(),
  };
}
const idempotencyKey = checkoutIdempotencyRef.current.key;
```

Этот паттерн уже есть в проекте для возвратов — см. `idempotencyRef`/`buildSaleReturnSignature` в `src/pages/sell/ui/RefundPurchase.tsx:260-268`, просто переиспользовать ту же идею.

### 3.2. Передача ключа

В `src/entities/sale/model/saleThunk.ts`, `productCheckout`:

```ts
export const productCheckout = createAsyncThunk<any, void | any>(
  "products/productCheckout",
  async ({ id, /* ...остальные поля... */, idempotencyKey }, { rejectWithValue }) => {
    try {
      const payload = {
        ...,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      };
      const { data } = await api.post(`main/pos/sales/${id}/checkout/`, payload, {
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      });
      return data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
```

(Отправить и в заголовке, и в теле — пока не согласовано с бэком, какой вариант он реализует; лишнее поле в теле бэк должен игнорировать без 400, как это уже принято в проекте — см. «Неизвестный extra — не 400» в `debt-installment-schedule-backend.md`.)

Дописать `idempotencyKey` в вызов:
```ts
dispatch(productCheckout({ id: saleId, ..., idempotencyKey }))
```

### 3.3. Обработка 409

В `handleAcceptPayment` (тот же файл) добавить обработку ответа `409` от бэка отдельно от прочих ошибок:

```ts
if (error?.response?.status === 409) {
  showAlert("info", "Оплата обрабатывается", "Подождите — этот платёж уже обрабатывается на другом устройстве.");
  return; // не ретраить автоматически
}
```

### 3.4. То же самое для `startSale`

По аналогии добавить `idempotencyKey` в `buildPosStartPayload`/`startSale` в местах, где создаётся корзина при явном пользовательском действии (открытие смены, «новая корзина» через `parkAndNewCart`) — обычные фоновые `refreshCartsFromStart()` для чтения текущего состояния в ключе не нуждаются, идемпотентность важна там, где реально **создаётся** что-то новое.

### 3.5. Опционально — предварительная проверка статуса

Перед отправкой `checkout`, если хочется дополнительной защиты без ожидания фикса на бэке: лёгкий `GET /pos/sales/{id}/` и проверка `status === "new"` — если уже не `"new"` (значит кто-то другой уже оплатил), сразу показать алерт «эта продажа уже оплачена» вместо отправки `checkout`. Это не заменяет идемпотентность на бэке (гонка всё равно возможна между `GET` и `POST`), но ловит очевидный случай без лишнего round-trip.

## 4. Тестирование

- Юнит-тест на фронте: один и тот же `checkoutIdempotencyRef` переиспользуется при повторном вызове `handleAcceptPayment` с теми же параметрами; новый генерируется при смене суммы/способа оплаты.
- Интеграционный тест (нужен доступ к тестовому бэку): два параллельных `POST /checkout/` с одним `Idempotency-Key` → один `201` + один `409` (или два одинаковых `201` с одинаковым телом, в зависимости от финальной реализации бэка).
- Ручная проверка: открыть кассу в двух вкладках под одним аккаунтом на одной смене, добавить товар с одной, попытаться оплатить с обеих почти одновременно.
