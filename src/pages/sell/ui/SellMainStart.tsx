import { useSellMainStart } from "./hooks/useSellMainStart";
import SellMainStartHeader from "./components/sellMainStart/SellMainStartHeader";
import SellMainStartCart from "./components/sellMainStart/SellMainStartCart";
import SellMainStartBody from "./components/sellMainStart/SellMainStartBody";
import SellMainStartModals from "./components/sellMainStart/SellMainStartModals";
import "./sell.scss";

const SellMainStart = () => {
  const vm = useSellMainStart();

  return (
    <section className="sell start">
      <SellMainStartHeader vm={vm} />
      <SellMainStartCart vm={vm} />
      <SellMainStartBody vm={vm} />
      <SellMainStartModals vm={vm} />
    </section>
  );
};

export default SellMainStart;
