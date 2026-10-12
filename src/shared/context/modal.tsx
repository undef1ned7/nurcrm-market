import { createContext, useState, useContext, useCallback } from "react";
import GlobalAlertModal from "@shared/ui/AlertModal/GlobalAlertModal";
import ConfirmModal from "@shared/ui/ConfirmModal/ConfirmModal";

const ModalContext = createContext<any>(null);

export const ModalProvider = ({ children }: any) => {
  const [modalState, setModalState] = useState<any>({
    isOpen: false,
    message: "",
    onConfirm: null,
    onCancel: null,
  });
  const [alertModal, setAlertModal] = useState<any>({
    isError: false,
    isOpen: false,
    message: "",
    onConfirm: null,
  });

  const openModal = useCallback(({ message, onConfirm, onCancel }) => {
    setModalState({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm(true);
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        onCancel(false);
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, []);

  const openAlert = useCallback(({ isError = false, message, onConfirm }) => {
    setAlertModal({
      isError,
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm(true);
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, openAlert }}>
      <ConfirmModal {...modalState} />
      <GlobalAlertModal {...alertModal} />
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
