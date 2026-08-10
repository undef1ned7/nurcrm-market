import SellMainStartProducts from "./SellMainStartProducts";
import SellMainStartTotals from "./SellMainStartTotals";
import type { SellMainStartVm } from "../../hooks/useSellMainStart";

type Props = {
  vm: SellMainStartVm;
};

export default function SellMainStartBody({ vm }: Props) {
  return (
    <div className="start__sell_body">
      <SellMainStartProducts vm={vm} />
      <SellMainStartTotals vm={vm} />
    </div>
  );
}
