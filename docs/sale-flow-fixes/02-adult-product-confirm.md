# Исправление: проверка «18+» должна уметь реально отказывать

**Баг:** [sale-flow-bugs.md, пункт 2](../sale-flow-bugs.md#2--проверка-товар-18-никогда-не-блокирует-продажу)
**Нужен бэк:** нет, чисто фронтовый баг
**Приоритет:** 🔴 критично — сейчас гейта продажи товаров 18+ фактически не существует

---

## 1. Проблема

`confirmAdultProduct` в `src/pages/cashier/ui/hooks/cashier/useCashierProducts.ts:275-310`:

```js
const confirmAdultProduct = useCallback((product) => {
  if (!isAdultProduct(product, company?.id)) return Promise.resolve(true);
  const alreadyInCart = ...;
  if (alreadyInCart) return Promise.resolve(true);

  return new Promise((resolve) => {
    const finish = (ok) => { ...; resolve(ok); };
    setAlertModal({
      ...,
      onConfirm: () => finish(true),
      onClose: () => finish(true),   // ← БАГ: закрытие = подтверждение
    });
  });
}, [company?.id]);
```

`AlertModal` (`src/shared/ui/AlertModal/AlertModal.tsx:41-50`) дополнительно резолвит `onConfirm || onClose` и на клик по фону, и на Escape/Enter. Итог: `finish(false)` нигде не вызывается ни при каких обстоятельствах — `allowed` в вызывающем коде (`useCashierCart.ts:134`, `handleAmbiguousCashierProductSelect`, скан-флоу) физически не может быть `false`.

## 2. План исправления

### 2.1. Новый тип модалки с явным отказом

`AlertModal` — общий компонент для простых информационных алертов (success/error/warning с одной кнопкой «ОК»), его семантику менять нельзя — это сломает все остальные вызовы `showAlert` в проекте (десятки мест).

Вместо этого — **отдельный компонент** для подтверждения с явным отказом, например `ConfirmModal` (в проекте уже есть `src/shared/ui/ConfirmModal/ConfirmModal.tsx` — проверить, подходит ли он по API, или сделать вариант специально под возрастное подтверждение).

Требования к компоненту:
- Две кнопки: «Подтвердить» (18+, продолжить) и «Отмена» (отказ).
- Клик по фону, Escape — трактуются как **отказ**, а не подтверждение (в отличие от `AlertModal`, где закрытие = «ОК», здесь это разные действия и разный смысл).
- Возвращает `Promise<boolean>`, как и сейчас — интерфейс `confirmAdultProduct` наружу можно не менять.

### 2.2. Правка `confirmAdultProduct`

```js
const confirmAdultProduct = useCallback((product) => {
  if (!isAdultProduct(product, company?.id)) return Promise.resolve(true);
  const alreadyInCart = (cartRef.current || []).some(
    (line) => !line.isCustom && String(line.productId) === String(product?.id),
  );
  if (alreadyInCart) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      setAgeCheckActive(false);
      dismissAdultAgeCheck();
      resolve(ok);
    };

    setAgeCheckActive(true);
    publishAdultAgeCheck(product?.name);
    setAgeConfirmModal({
      open: true,
      title: "Товар 18+",
      message: "Этот товар предназначен для совершеннолетних. Продолжить продажу?",
      confirmText: "Подтвердить",
      cancelText: "Отмена",
      onConfirm: () => finish(true),
      onCancel: () => finish(false),   // ← новое: явный отказ
    });
  });
}, [company?.id]);
```

Завести отдельный кусок стейта `ageConfirmModal` (не переиспользовать `alertModal`, чтобы не смешивать семантику «одна кнопка» / «две кнопки с разным смыслом»), и отдельный компонент в `CashierPageModals.tsx`:

```jsx
<ConfirmModal
  open={ageConfirmModal.open}
  title={ageConfirmModal.title}
  message={ageConfirmModal.message}
  confirmText={ageConfirmModal.confirmText}
  cancelText={ageConfirmModal.cancelText}
  onConfirm={() => { const cb = ageConfirmModal.onConfirm; setAgeConfirmModal({ open: false }); cb?.(); }}
  onCancel={() => { const cb = ageConfirmModal.onCancel; setAgeConfirmModal({ open: false }); cb?.(); }}
/>
```

### 2.3. Проверить все вызывающие места

Убедиться, что везде, где вызывается `confirmAdultProduct`, обработка `false` реально что-то делает (сейчас код там уже написан правильно, просто раньше `false` не мог случиться — теперь эти ветки станут достижимыми и должны корректно откатывать состояние):

- `useCashierCart.ts:134` (`addToCartWithPackage`) — `if (!allowed) return;` — ничего дополнительно откатывать не нужно, товар ещё не добавлен.
- `useCashierCart.ts` (`handleAmbiguousCashierProductSelect`) — то же самое, проверить, что при отказе модалка неоднозначности штрихкода (`barcodeAmbiguity`) корректно закрывается/остаётся открытой по ожидаемому UX (сейчас просто `return`, стоит явно решить — оставить открытой для выбора другого товара, или закрыть).
- `useCashierBarcode.ts` (в скан-флоу) — при отказе сканирование должно завершиться без добавления товара и без зависания `barcodeProcessingRef`/`isScanningRef` в `true`.

### 2.4. Тест

Добавить/обновить unit-тест на `confirmAdultProduct` (или на компонент, если логика туда переедет): явно проверить, что `onCancel` резолвит `false`, а `onConfirm` — `true`, и что кейс "клик по фону"/Escape в новом компоненте не эквивалентен подтверждению.

## 3. Бэк

Не требуется — это чисто клиентская логика подтверждения перед добавлением в локальную корзину. Бэк уже получает финальное решение через сам факт `add-item`/`scan` запроса (если фронт не добавил товар — запрос на бэк вообще не уйдёт).
