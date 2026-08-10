import "./AddProductBarcode.scss";
import { useAddProductBarcode } from "./AddProductBarcode/useAddProductBarcode";
import AddProductBarcodeView from "./AddProductBarcode/AddProductBarcodeView";

const AddProductBarcode = (props: any) => {
  const vm = useAddProductBarcode(props);
  return <AddProductBarcodeView {...vm} />;
};

export default AddProductBarcode;
