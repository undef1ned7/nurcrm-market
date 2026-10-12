import { PaymentBlock } from "./components/PaymentBlock";

export const paymentBlockMemo = (
  sectorName,
  debt,
  phone,
  setDebt,
  setPhone,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
  dueDate,
  setDueDate
) => {
  if (sectorName !== "Магазин" && !window.location.href.includes("agents"))
    return "";
  return (
    <PaymentBlock
      sectorName={sectorName}
      debt={debt}
      setDebt={setDebt}
      phone={phone}
      setPhone={setPhone}
      amount={amount}
      setAmount={setAmount}
      debtMonths={debtMonths}
      setDebtMonths={setDebtMonths}
      dueDate={dueDate}
      setDueDate={setDueDate}
    />
  );
};

