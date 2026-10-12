import { useState, useCallback } from "react";
import {
  createClientAsync,
  fetchClientsAsync,
} from "@entities/client";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAppDispatch } from "@app/store";

/**
 * Хук для управления формой создания поставщика
 */
export const useSupplierForm = (setNewItemData: any, showAlert: any) => {
  const dispatch = useAppDispatch();
  const [showInputs, setShowInputs] = useState(false);
  const [state, setState] = useState({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "suppliers",
    llc: "",
    inn: "",
    okpo: "",
    score: "",
    bik: "",
    address: "",
  });

  const onChange = useCallback((e: any) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onSubmit = useCallback(
    async (e: any) => {
      e.preventDefault();
      try {
        const client: any = await dispatch(
          createClientAsync(state as any),
        ).unwrap();
        dispatch(fetchClientsAsync({} as any));
        setShowInputs(false);
        // Автоматически выбираем созданного поставщика
        if (client?.id) {
          setNewItemData((prev: any) => ({
            ...prev,
            client: String(client.id),
          }));
        }
        setState({
          full_name: "",
          phone: "",
          email: "",
          date: new Date().toISOString().split("T")[0],
          type: "suppliers",
          llc: "",
          inn: "",
          okpo: "",
          score: "",
          bik: "",
          address: "",
        });
        showAlert("Поставщик успешно создан!", "success", "Успех");
      } catch (e: any) {
        console.log(e);
        showAlert(
          validateResErrors(e, "Ошибка при создании поставщика"),
          "error",
          "Ошибка",
        );
      }
    },
    [dispatch, state, setNewItemData, showAlert],
  );

  return {
    showInputs,
    setShowInputs,
    state,
    setState,
    onChange,
    onSubmit,
  };
};
