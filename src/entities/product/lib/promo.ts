/**
 * «Акционный товар». Понятное имя поля — `is_promo`; старое `stock` бэк
 * поддерживает на переходный период (docs/backend/calculator-after-stress-test/04-data-contract.md).
 * `stock` — это НЕ признак складского товара и не остаток.
 */
export const isPromoProduct = (p: any): boolean => Boolean(p?.is_promo ?? p?.stock);

/**
 * Поля для сохранения товара: шлём оба имени, пока на всех серверах не выкатили
 * `is_promo` — старый сервер возьмёт `stock`, новый — `is_promo` (значения равны).
 */
export const promoPayload = (isPromo: boolean) => ({ is_promo: isPromo, stock: isPromo });
