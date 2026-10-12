import "./CreateSaleDocument.scss";
import { useCreateSaleDocument } from "./hooks/useCreateSaleDocument";
import CreateSaleDocumentView from "./create-sale/CreateSaleDocumentView";

const CreateSaleDocument = () => {
  const vm = useCreateSaleDocument();
  return <CreateSaleDocumentView {...vm} />;
};

export default CreateSaleDocument;
