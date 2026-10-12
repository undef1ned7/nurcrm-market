/**
 * Раньше этот тип был объявлен дважды с разным набором полей —
 * cashierPage.types.ts (с onConfirm?/onClose?) и paymentPage.types.ts (без
 * них). Правка логики алертов в одном месте могла разойтись со вторым типом
 * без единой ошибки компиляции. См. docs/sale-flow-bugs.md, пункт 10.
 */
export type AlertModalState = {
  open: boolean;
  type: string;
  title: string;
  message: string;
  okText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
};
