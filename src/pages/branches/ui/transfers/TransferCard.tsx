import { FaArrowDown, FaArrowRight, FaArrowUp } from "react-icons/fa";
import { StatusChip } from "@shared/ui/page-shell";
import type { BranchTransfer } from "@entities/branch";
import {
  TRANSFER_STATUS_LABEL,
  TRANSFER_STATUS_TONE,
  fmtDate,
  fmtMoney,
  fmtQty,
  transferDirection,
  transferPlaceName,
} from "./transfers.utils";

/** Мобильное представление строки истории (таблица на узких экранах скрыта). */
export default function TransferCard({
  row,
  branchId = "",
  onOpen,
}: {
  row: BranchTransfer;
  branchId?: string;
  onOpen: () => void;
}) {
  const d = transferDirection(row, branchId);
  const count = row.items_count ?? row.items?.length;

  return (
    <li>
      <button
        type="button"
        className={`transfer-card${row.status === "cancelled" ? " is-cancelled" : ""}`}
        onClick={onOpen}
      >
        <span className="transfer-card__top">
          <span className="transfer-card__number">
            {d && (
              <span className={`transfers__dir transfers__dir--${d}`}>
                {d === "in" ? <FaArrowDown /> : <FaArrowUp />}
              </span>
            )}
            {row.number}
          </span>
          <StatusChip tone={TRANSFER_STATUS_TONE[row.status]}>
            {TRANSFER_STATUS_LABEL[row.status] || row.status}
          </StatusChip>
        </span>

        <span className="transfer-card__route">
          <span>{transferPlaceName(row.from_branch)}</span>
          <FaArrowRight />
          <span>{transferPlaceName(row.to_branch)}</span>
        </span>

        <span className="transfer-card__bottom">
          <span className="transfer-card__meta">
            {fmtDate(row.date)}
            {count != null && ` · ${count} поз.`} · {fmtQty(row.total_quantity)} ед.
          </span>
          <b className="transfer-card__sum">{fmtMoney(row.total_amount)} сом</b>
        </span>
      </button>
    </li>
  );
}
