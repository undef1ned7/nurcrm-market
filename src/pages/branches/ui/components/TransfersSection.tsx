import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  FaArrowDown,
  FaArrowUp,
  FaExchangeAlt,
  FaHistory,
  FaPlug,
} from "react-icons/fa";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusChip,
} from "@shared/ui/page-shell";
import { BranchSection } from "./BranchSection";
import { fetchTransfers, type BranchTransfer } from "@entities/branch";
import {
  TRANSFER_STATUS_LABEL,
  TRANSFER_STATUS_TONE,
  fmtDate,
  fmtMoney,
  fmtQty,
  transferDirection,
  transferPlaceName,
} from "../transfers/transfers.utils";
import TransferCard from "../transfers/TransferCard";
import "../transfers/BranchTransfers.scss";

/** Последние перемещения филиала; полная история — /crm/branch/transfers?branch=… */
export default function TransfersSection({ branchId }: { branchId: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<BranchTransfer[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"" | "failed" | "not-connected">("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchTransfers({ branch: branchId })
      .then((res) => {
        if (!alive) return;
        setItems(res.items.slice(0, 10));
        setCount(res.count);
      })
      // 404 — эндпоинт перемещений ещё не выкатили на бэке.
      .catch(
        (err) =>
          alive &&
          setError(err?.response?.status === 404 ? "not-connected" : "failed"),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [branchId]);

  const historyUrl = `/crm/branch/transfers?branch=${branchId}`;

  return (
    <BranchSection
      title={t("crm.branches.details.transfers.title")}
      count={loading || error ? null : count}
      actions={
        <>
          <button
            type="button"
            className="nur-btn nur-btn--primary nur-btn--sm"
            onClick={() => navigate(`/crm/branch/transfers/new?to=${branchId}`)}
          >
            <FaArrowDown /> {t("crm.branches.details.transfers.bringIn")}
          </button>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => navigate(`/crm/branch/transfers/new?from=${branchId}`)}
          >
            <FaArrowUp /> {t("crm.branches.details.transfers.send")}
          </button>
          {!error && (
            <button
              type="button"
              className="nur-btn nur-btn--ghost nur-btn--sm"
              onClick={() => navigate(historyUrl)}
            >
              <FaHistory /> {t("crm.branches.details.transfers.history")}
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <LoadingState rows={5} />
      ) : error === "not-connected" ? (
        <EmptyState
          icon={<FaPlug />}
          title={t("crm.branches.details.transfers.notConnectedTitle")}
          text={t("crm.branches.details.transfers.notConnectedText")}
        />
      ) : error ? (
        <ErrorState text={t("crm.branches.details.transfers.loadFailed")} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FaExchangeAlt />}
          title={t("crm.branches.details.transfers.emptyTitle")}
          text={t("crm.branches.details.transfers.emptyText")}
        />
      ) : (
        <>
          <div className="nur-table-wrap transfers__table-wrap">
            <table className="nur-table bd-table">
              <thead>
                <tr>
                  <th>{t("crm.branches.details.transfers.table.number")}</th>
                  <th>{t("crm.branches.details.transfers.table.date")}</th>
                  <th>{t("crm.branches.details.transfers.table.direction")}</th>
                  <th className="is-num">{t("crm.branches.details.transfers.table.quantity")}</th>
                  <th className="is-num">{t("crm.branches.details.transfers.table.amount")}</th>
                  <th>{t("crm.branches.details.transfers.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const d = transferDirection(row, branchId);
                  return (
                    <tr
                      key={row.id}
                      className="transfers__row"
                      onClick={() => navigate(`${historyUrl}&open=${row.id}`)}
                    >
                      <td className="transfers__number">{row.number}</td>
                      <td>{fmtDate(row.date)}</td>
                      <td>
                        <span className="transfers__route">
                          <span
                            className={`transfers__dir transfers__dir--${d || "in"}`}
                          >
                            {d === "out" ? <FaArrowUp /> : <FaArrowDown />}
                          </span>
                          {d === "out"
                            ? t("crm.branches.details.transfers.directionTo", {
                                name: transferPlaceName(row.to_branch),
                              })
                            : t("crm.branches.details.transfers.directionFrom", {
                                name: transferPlaceName(row.from_branch),
                              })}
                        </span>
                      </td>
                      <td className="is-num">{fmtQty(row.total_quantity)}</td>
                      <td className="is-num">{fmtMoney(row.total_amount)}</td>
                      <td>
                        <StatusChip tone={TRANSFER_STATUS_TONE[row.status]}>
                          {TRANSFER_STATUS_LABEL[row.status] || row.status}
                        </StatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="transfers__cards">
            {items.map((row) => (
              <TransferCard
                key={row.id}
                row={row}
                branchId={branchId}
                onOpen={() => navigate(`${historyUrl}&open=${row.id}`)}
              />
            ))}
          </ul>
        </>
      )}
    </BranchSection>
  );
}
