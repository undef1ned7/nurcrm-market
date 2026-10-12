
export type AlertState = {
  open: boolean;
  type: "success" | "error" | string;
  message: string;
};

export type ClientFormState = {
  full_name: string;
  phone: string;
  email: string;
  date: string;
  type: string;
  llc: string;
  inn: string;
  okpo: string;
  score: string;
  bik: string;
  address: string;
};

export type CashDataState = {
  cashbox: string;
  type: string;
  name: string;
  amount: string;
  source_cashbox_flow_id: string;
  source_business_operation_id: string;
  status: string;
};

export type CustomServiceState = {
  name: string;
  price: string;
  quantity: string;
};

export type DebtFormState = {
  phone: string;
  dueDate: string;
};

export type PaymentMethod = "cash" | "card" | null;

export type PendingCheckout = {
  withReceipt: boolean;
  paymentType: string;
} | null;

export type ItemQuantitiesMap = Record<string | number, string>;
