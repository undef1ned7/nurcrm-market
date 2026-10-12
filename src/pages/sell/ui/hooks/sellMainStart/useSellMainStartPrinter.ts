import { useEffect, useState } from "react";
import {
  attachUsbListenersOnce,
  checkPrinterConnection,
} from "../../services/printService";

export function useSellMainStartPrinter() {
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

  useEffect(() => {
    const checkPrinterConnectionAsync = async () => {
      const connected = await checkPrinterConnection();
      setIsPrinterConnected(connected);
    };

    // Автоподключение USB при монтировании
    attachUsbListenersOnce();

    // Проверяем при монтировании
    checkPrinterConnectionAsync();

    // Проверяем периодически (каждые 2 секунды)
    const interval = setInterval(checkPrinterConnectionAsync, 2000);

    // Слушаем события подключения/отключения USB
    const handleConnect = async () => {
      // Небольшая задержка, чтобы устройство успело подключиться
      setTimeout(checkPrinterConnectionAsync, 500);
    };
    const handleDisconnect = () => {
      setIsPrinterConnected(false);
    };

    const navUsb = (navigator as any).usb;
    if (navUsb) {
      navUsb.addEventListener("connect", handleConnect);
      navUsb.addEventListener("disconnect", handleDisconnect);
    }

    return () => {
      clearInterval(interval);
      if (navUsb) {
        navUsb.removeEventListener("connect", handleConnect);
        navUsb.removeEventListener("disconnect", handleDisconnect);
      }
    };
  }, []);


  return { isPrinterConnected };
}
