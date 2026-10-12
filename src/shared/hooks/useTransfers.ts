// src/hooks/useTransfers.js
import { useSelector } from "react-redux";

export const useTransfers = () => {
  const transfers = useSelector((state: any) => state.transfer);
  return transfers;
};

export const useAcceptances = () => {
  const acceptances = useSelector((state: any) => state.acceptance);
  return acceptances;
};
