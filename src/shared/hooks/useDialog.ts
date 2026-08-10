import { useCallback } from "react";
import { useModal } from "@shared/context/modal";

// Все хуки возвращают СТАБИЛЬНУЮ функцию (useCallback): иначе компоненты,
// которые кладут alert/confirm в зависимости useEffect/useCallback, попадают
// в бесконечный цикл ре-рендеров и запросов. openAlert/openModal в провайдере
// уже мемоизированы (useCallback с []), поэтому ссылка действительно стабильна.

const useAlert = (): ((message: any, callback?: any, isError?: any) => any) => {
    const { openAlert } = useModal();

    return useCallback(
        (message: any, callback?: any, isError?: any) => {
            if (typeof callback === "boolean") {
                isError = callback;
                callback = () => null;
            }
            return openAlert({
                isError: Boolean(isError),
                message,
                onConfirm: (result: any) => callback?.(result),
            });
        },
        [openAlert],
    );
};

const useErrorModal = () => {
    const { openAlert } = useModal();

    return useCallback(
        (message: any, callback: any) => {
            openAlert({
                isError: true,
                message,
                onConfirm: (result: any) => callback?.(result),
            });
        },
        [openAlert],
    );
};

const useConfirm = () => {
    const { openModal } = useModal();

    return useCallback(
        (message: any, callback: any) => {
            openModal({
                message,
                onConfirm: (result: any) => callback(result),
                onCancel: (result: any) => callback(result),
            });
        },
        [openModal],
    );
};

export { useAlert, useConfirm, useErrorModal };
