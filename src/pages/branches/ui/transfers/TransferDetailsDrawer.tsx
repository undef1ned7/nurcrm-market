import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  FaArrowRight,
  FaBan,
  FaCopy,
  FaFilePdf,
  FaPrint,
  FaTimes,
} from "react-icons/fa";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import { StatusChip, LoadingState, ErrorState } from "@shared/ui/page-shell";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  cancelTransfer,
  fetchTransfer,
  type BranchTransfer,
} from "@entities/branch";
import { downloadTransferPdf, openTransferPdf } from "./transferPdf";
import {
  TRANSFER_STATUS_LABEL,
  TRANSFER_STATUS_TONE,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtQty,
  transferItemAmount,
  transferItemPrice,
  transferPlaceName,
} from "./transfers.utils";

type Props = {
  id: string;
  onClose: () => void;
  onChanged: () => void;
};

export default function TransferDetailsDrawer({ id, onClose, onChanged }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<BranchTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "pdf" | "print" | "cancel">("");
  const [actionError, setActionError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchTransfer(id)
      .then((t) => alive && setData(t))
      .catch((err) =>
        alive &&
        setError(validateResErrors(err?.response?.data || err, "")),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (kind: "pdf" | "print", fn: () => Promise<void>) => {
    setBusy(kind);
    setActionError("");
    try {
      await fn();
    } catch (err: any) {
      setActionError(
        validateResErrors(err?.response?.data || err, "Не удалось сформировать накладную. "),
      );
    } finally {
      setBusy("");
    }
  };

  const doCancel = async () => {
    if (!data) return;
    setBusy("cancel");
    setActionError("");
    try {
      const updated = await cancelTransfer(data.id, reason.trim());
      setData(updated?.id ? updated : { ...data, status: "cancelled" });
      setCancelOpen(false);
      onChanged();
    } catch (err: any) {
      setActionError(
        validateResErrors(err?.response?.data || err, "Не удалось отменить перемещение. "),
      );
    } finally {
      setBusy("");
    }
  };

  const items = data?.items || [];
  const totalQty =
    data?.total_quantity != null
      ? Number(data.total_quantity)
      : items.reduce((a, it) => a + Number(it.quantity || 0), 0);
  const totalSum =
    data?.total_amount != null
      ? Number(data.total_amount)
      : items.reduce((a, it) => a + transferItemAmount(it), 0);

  return (
    <ReactPortal wrapperId="branch-transfer-drawer">
      <div className="transfer-drawer-overlay" onClick={onClose}>
        <aside
          className="transfer-drawer"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Перемещение"
        >
          <header className="transfer-drawer__head">
            <div>
              <h3>{data ? `Перемещение ${data.number}` : "Перемещение"}</h3>
              {data && (
                <StatusChip tone={TRANSFER_STATUS_TONE[data.status]}>
                  {TRANSFER_STATUS_LABEL[data.status] || data.status}
                </StatusChip>
              )}
            </div>
            <button
              type="button"
              className="nur-btn nur-btn--ghost nur-btn--sm"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <FaTimes />
            </button>
          </header>

          <div className="transfer-drawer__body">
            {loading && <LoadingState rows={5} />}
            {!loading && error && <ErrorState text={error || undefined} />}
            {!loading && data && (
              <>
                <div className="transfer-drawer__route">
                  <div>
                    <small>Откуда</small>
                    <b>{transferPlaceName(data.from_branch)}</b>
                  </div>
                  <FaArrowRight />
                  <div>
                    <small>Куда</small>
                    <b>{transferPlaceName(data.to_branch)}</b>
                  </div>
                </div>

                <dl className="transfer-drawer__meta">
                  <dt>Дата</dt>
                  <dd>{fmtDate(data.date)}</dd>
                  <dt>Провёл</dt>
                  <dd>{data.created_by?.full_name || "—"}</dd>
                  <dt>Создано</dt>
                  <dd>{fmtDateTime(data.created_at)}</dd>
                  {data.comment && (
                    <>
                      <dt>Комментарий</dt>
                      <dd>{data.comment}</dd>
                    </>
                  )}
                  {data.status === "cancelled" && (
                    <>
                      <dt>Отменено</dt>
                      <dd>
                        {fmtDateTime(data.cancelled_at)}
                        {data.cancel_reason ? ` — ${data.cancel_reason}` : ""}
                      </dd>
                    </>
                  )}
                </dl>

                <div className="nur-table-wrap">
                  <table className="nur-table transfer-drawer__table">
                    <thead>
                      <tr>
                        <th>№</th>
                        <th>Товар</th>
                        <th>Кол-во</th>
                        <th className="transfer-drawer__col-price">Цена</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={it.id || `${it.product}-${i}`}>
                          <td>{i + 1}</td>
                          <td>
                            {it.name}
                            {(it.barcode || it.article) && (
                              <div className="transfer-drawer__sub">
                                {it.barcode || it.article}
                              </div>
                            )}
                          </td>
                          <td>
                            {fmtQty(it.quantity)} {it.unit || "шт"}
                          </td>
                          <td className="transfer-drawer__col-price">
                            {fmtMoney(transferItemPrice(it))}
                          </td>
                          <td>{fmtMoney(transferItemAmount(it))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td />
                        <td>
                          <b>Итого: {items.length} поз.</b>
                        </td>
                        <td>
                          <b>{fmtQty(totalQty)}</b>
                        </td>
                        <td className="transfer-drawer__col-price" />
                        <td>
                          <b>{fmtMoney(totalSum)}</b>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {cancelOpen && (
                  <div className="transfer-drawer__cancel">
                    <p>
                      Остатки вернутся на «{transferPlaceName(data.from_branch)}».
                      Если товар уже продан в получателе, отменить не получится.
                    </p>
                    <input
                      className="nur-input"
                      placeholder="Причина отмены (необязательно)"
                      value={reason}
                      maxLength={500}
                      onChange={(e) => setReason(e.target.value)}
                      autoFocus
                    />
                    <div className="transfer-drawer__cancel-actions">
                      <button
                        type="button"
                        className="nur-btn nur-btn--ghost nur-btn--sm"
                        onClick={() => setCancelOpen(false)}
                        disabled={busy === "cancel"}
                      >
                        Не отменять
                      </button>
                      <button
                        type="button"
                        className="nur-btn nur-btn--danger nur-btn--sm"
                        onClick={doCancel}
                        disabled={busy === "cancel"}
                      >
                        {busy === "cancel" ? "Отмена…" : "Подтвердить отмену"}
                      </button>
                    </div>
                  </div>
                )}

                {actionError && (
                  <div className="branch__alert branch__alert--error">{actionError}</div>
                )}
              </>
            )}
          </div>

          {data && (
            <footer className="transfer-drawer__foot">
              <button
                type="button"
                className="nur-btn nur-btn--primary nur-btn--sm"
                disabled={Boolean(busy)}
                onClick={() => run("pdf", () => downloadTransferPdf(data))}
              >
                <FaFilePdf /> {busy === "pdf" ? "Формирование…" : "Накладная PDF"}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary nur-btn--sm"
                disabled={Boolean(busy)}
                onClick={() => run("print", () => openTransferPdf(data))}
              >
                <FaPrint /> Печать
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary nur-btn--sm"
                onClick={() => navigate(`/crm/branch/transfers/new?repeat=${data.id}`)}
                title="Создать новое перемещение с теми же товарами"
              >
                <FaCopy /> Повторить
              </button>
              {data.status === "completed" && !cancelOpen && (
                <button
                  type="button"
                  className="nur-btn nur-btn--danger nur-btn--sm transfer-drawer__cancel-btn"
                  disabled={Boolean(busy)}
                  onClick={() => setCancelOpen(true)}
                >
                  <FaBan /> Отменить
                </button>
              )}
            </footer>
          )}
        </aside>
      </div>
    </ReactPortal>
  );
}
