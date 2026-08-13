import type { ReactNode } from "react";
import type { ConsultantDraft, SaleConsultant } from "@entities/sale";

export type PaymentMethodId = "cash" | "cashless" | "deferred" | "split";

export type PaymentMethodOption = {
  id: PaymentMethodId;
  label: string;
  description: string;
};

export type PaymentBank = {
  id: string;
  name: string;
  logo: string | ReactNode | null;
};

export type PaymentAmounts = {
  cash: number;
  cashless: number;
  deferred: number;
};

export type ReceiptData = {
  saleId: string | number;
  checkoutResponse?: unknown;
} | null;

export type AlertModalState = {
  open: boolean;
  type: string;
  title: string;
  message: string;
};

export type PaymentCustomer = {
  id?: string | number;
  full_name?: string;
  name?: string;
  phone?: string;
  debt?: number;
  total_debt?: number;
  [key: string]: unknown;
} | null;

export type PaymentSale = {
  order_discount_total?: number | string;
  tax_total?: number | string;
  [key: string]: unknown;
} | null;

export type PaymentConsultantVm = {
  draft: ConsultantDraft;
  consultants: SaleConsultant[];
  consultantsLoading: boolean;
  previewAmount: number;
  handleSpecifyChange: (value: boolean) => void;
  handleConsultantChange: (id: string, name: string) => void;
  handleCommissionEnabledChange: (value: boolean) => void;
  handlePercentChange: (value: string) => void;
};

export type PaymentPageProps = {
  cart?: unknown[];
  total: number;
  customer?: PaymentCustomer;
  onBack: () => void;
  onSelectCustomer?: (customer: PaymentCustomer) => void;
  onComplete: () => void;
  customers?: unknown[];
  saleId?: string | number;
  sale?: PaymentSale;
  consultantDraft?: ConsultantDraft;
  onConsultantDraftChange?: (draft: ConsultantDraft) => void;
};
