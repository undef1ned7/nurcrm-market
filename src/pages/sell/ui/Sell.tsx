import { useSellPage } from "./hooks/useSellPage";
import SellHeader from "./components/sell/SellHeader";
import SellHistory from "./components/sell/SellHistory";
import SellPagination from "./components/sell/SellPagination";
import SellModals from "./components/sell/SellModals";
import "./sell.scss";

const Sell = () => {
  const vm = useSellPage();

  return (
    <div>
      <SellHeader vm={vm} />
      <SellHistory vm={vm} />
      <SellPagination vm={vm} />
      <SellModals vm={vm} />
    </div>
  );
};

export default Sell;
