import { useEffect, useMemo, useState } from "react";
import { fetchClientsAsync, useClient } from "@entities/client";
import { buildInitialClientForm } from "../../utils/sellMainStartUtils";

export function useSellMainStartClient({ company, dispatch }: any) {
  const { list: clients = [] } = useClient();
  const [clientId, setClientId] = useState("");
  const [debtMonths, setDebtMonths] = useState("");
  const [form, setForm] = useState(() => buildInitialClientForm());
  const [submitTried, setSubmitTried] = useState(false);
  const [touched, setTouched] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [debt, setDebt] = useState("");
  const [amount, setAmount] = useState("");
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [, setSelectClient] = useState("");
  const [state, setState] = useState({
    phone: "",
    dueDate: "",
  });

  const { pickClient, filterClient } = useMemo(() => {
    const list: any[] = Array.isArray(clients) ? clients : [];
    const filterClient = list.filter((c: any) => c.type === "client");
    const pickClient = filterClient.find(
      (x: any) => String(x.id) === String(clientId)
    );
    return { filterClient, pickClient };
  }, [clients, clientId]);

  useEffect(() => {
    if (company?.subscription_plan?.name === "Старт" && pickClient?.phone) {
      setState((prev) => ({ ...prev, phone: pickClient.phone }));
    }
  }, [clientId, pickClient, company?.subscription_plan?.name]);

  useEffect(() => {
    dispatch(fetchClientsAsync(undefined as any));
  }, [dispatch]);

  const onChange2 = (e: any) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  return {
    clients,
    clientId,
    setClientId,
    debtMonths,
    setDebtMonths,
    form,
    setForm,
    submitTried,
    setSubmitTried,
    touched,
    setTouched,
    errors,
    setErrors,
    debt,
    setDebt,
    amount,
    setAmount,
    showNewClientModal,
    setShowNewClientModal,
    showDebtModal,
    setShowDebtModal,
    setSelectClient,
    state,
    setState,
    onChange2,
    pickClient,
    filterClient,
  };
}
