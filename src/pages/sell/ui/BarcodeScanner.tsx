import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import useScanDetection from "@shared/hooks/useScanDetection";
import {
  manualFilling,
  sendBarCode,
  startSale,
} from "@entities/sale";
import { useSale } from "@entities/sale";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { getBarcodeAmbiguity } from "@shared/lib/tools/barcodeAmbiguity";
import BarcodeAmbiguityModal from "@shared/ui/BarcodeAmbiguityModal/BarcodeAmbiguityModal";
// import { sendBarCode } from "@entities/product";

const BarcodeScanner = ({ id }: any) => {
  const [barcodeScan, setBarcodeScan] = useState<any>("");
  const { barcodeError } = useSale();
  const alert = useAlert();
  const dispatch = useDispatch<any>();
  const [ambiguity, setAmbiguity] = useState<any>(null);
  const [ambiguityLoading, setAmbiguityLoading] = useState<any>(false);
  // const id = "some-sale-id";
  useScanDetection({
    onComplete: (scanned: any) => {
      if (scanned.length >= 3) {
        setBarcodeScan(scanned);
      }
    },
    minLength: 3,
  });

  useEffect(() => {
    if (!barcodeScan) return;
    (async () => {
      try {
        const result = await dispatch(
          sendBarCode({ barcode: barcodeScan, id })
        ).unwrap();
        await dispatch(startSale(undefined as any)).unwrap();

        if (result?.error) {
          const errorMessage = validateResErrors(result.error, "Ошибка от сервера");
          alert(errorMessage, true);
          return;
        }
      } catch (err: any) {
        const barcodeAmbiguity = getBarcodeAmbiguity(err);
        if (barcodeAmbiguity) {
          setAmbiguity(barcodeAmbiguity);
          return;
        }
        const errorMessage = validateResErrors(err, "Ошибка при сканировании штрих-кода");
        alert(errorMessage, true);
      } finally {
        setBarcodeScan("");
      }
    })();
  }, [alert, barcodeScan, dispatch, id]);

  const selectAmbiguousProduct = async (match: any) => {
    if (!id || !match?.id) return;
    setAmbiguityLoading(true);
    try {
      await dispatch(
        manualFilling({ id, productId: match.id, quantity: 1 }),
      ).unwrap();
      await dispatch(startSale(undefined as any)).unwrap();
      setAmbiguity(null);
    } catch (err: any) {
      alert(
        validateResErrors(err, "Не удалось добавить выбранный товар"),
        true,
      );
    } finally {
      setAmbiguityLoading(false);
    }
  };

  return (
    <div>
      {barcodeError?.message && (
        <p style={{ color: "red", marginLeft: "30px" }}>
          {barcodeError.message}
        </p>
      )}
      <BarcodeAmbiguityModal
        open={Boolean(ambiguity)}
        message={ambiguity?.message}
        matches={ambiguity?.matches}
        loading={ambiguityLoading}
        onSelect={selectAmbiguousProduct}
        onClose={() => {
          if (!ambiguityLoading) setAmbiguity(null);
        }}
      />
      {/* </p> */}
    </div>
  );
};

export default BarcodeScanner;
