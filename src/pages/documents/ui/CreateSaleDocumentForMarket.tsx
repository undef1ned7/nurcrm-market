import "./CreateSaleDocument.scss";
import { useCreateSaleDocumentForMarket } from "./hooks/useCreateSaleDocumentForMarket";
import CreateSaleDocumentForMarketView from "./create-sale/CreateSaleDocumentForMarketView";

const CreateSaleDocumentForMarket = () => {
  const vm = useCreateSaleDocumentForMarket();
  return <CreateSaleDocumentForMarketView {...vm} />;
};

export default CreateSaleDocumentForMarket;
