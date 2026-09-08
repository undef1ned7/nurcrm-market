import { useMemo, useState } from "react";
import { X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import { useAppDispatch } from "@app/store";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  requestCashFlowEdit,
  requestCashFlowCancel,
  buildEditRequestPayload,
  buildCancelRequestPayload,
  isValidProposedChange,
  hasProposedDiff,
  type ProposedFlowChange,
} from "@entities/cash";

/**
 * Заявка на редактирование / отмену одобренного движения кассы.
 * Ничего не применяет сразу — создаёт pending-заявку на той же кассе.
 * @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md
 */
const FlowChangeRequestModal = ({ mode, flow, onClose, onSubmitted }: any) => {
  const dispatch = useAppDispatch();
  const alert = useAlert();
  const isCancel = mode === "cancel";

  const current: ProposedFlowChange = useMemo(
    () => ({
      name: String(flow?.name ?? ""),
      amount: String(flow?.amount ?? ""),
      type: flow?.type === "income" ? "income" : "expense",
    }),
    [flow],
  );

  const [form, setForm] = useState<ProposedFlowChange>(current);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const editValid =
    isValidProposedChange(form) && hasProposedDiff(current, form);
  const canSubmit = isCancel ? reason.trim().length > 0 : editValid;

  const submit = async () => {
    if (!flow?.id || submitting) return;
    setSubmitting(true);
    try {
      if (isCancel) {
        await dispatch(
          requestCashFlowCancel({
            targetFlowId: flow.id,
            payload: buildCancelRequestPayload(flow.id, reason),
          }),
        ).unwrap();
      } else {
        await dispatch(
          requestCashFlowEdit({
            targetFlowId: flow.id,
            payload: buildEditRequestPayload(flow.id, form, reason),
          }),
        ).unwrap();
      }
      alert(
        isCancel
          ? "Заявка на отмену движения отправлена на подтверждение"
          : "Заявка на изменение движения отправлена на подтверждение",
      );
      onSubmitted?.();
      onClose?.();
    } catch (e: any) {
      alert(validateResErrors(e, "Не удалось создать заявку. Попробуйте ещё раз."), true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReactPortal wrapperId="kassa-flow-change-modal">
      <div className="vitrina__overlay" role="presentation" onClick={onClose}>
        <div
          className="vitrina__modal vitrina__modal--edit"
          role="dialog"
          aria-modal="true"
          aria-label={isCancel ? "Отмена движения" : "Изменение движения"}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="vitrina__modal-header">
            <h3>{isCancel ? "Отмена движения" : "Изменение движения"}</h3>
            <X className="vitrina__close-icon" size={20} onClick={onClose} />
          </div>

          <div className="vitrina__modal-section">
            <label>Текущее</label>
            <span
              className="debt__input"
              style={{ padding: 8, display: "block" }}
            >
              {current.type === "income" ? "Приход" : "Расход"} ·{" "}
              {current.name || "—"} · {current.amount || "—"} с
            </span>
          </div>

          {!isCancel && (
            <>
              <div className="vitrina__modal-section">
                <label>Наименование</label>
                <input
                  type="text"
                  className="vitrina__modal-input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="vitrina__modal-section">
                <label>Сумма</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="vitrina__modal-input"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                />
              </div>
              <div className="vitrina__modal-section">
                <label>Тип операции</label>
                <select
                  className="vitrina__modal-input"
                  value={form.type}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      type: e.target.value === "income" ? "income" : "expense",
                    }))
                  }
                >
                  <option value="expense">Расход</option>
                  <option value="income">Приход</option>
                </select>
              </div>
            </>
          )}

          <div className="vitrina__modal-section">
            <label>Причина{isCancel ? "" : " (необязательно)"}</label>
            <input
              type="text"
              className="vitrina__modal-input"
              placeholder={
                isCancel ? "Например, дубликат прихода" : "Например, ошиблись суммой"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="vitrina__modal-footer">
            <button
              className="vitrina__button vitrina__button--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Закрыть
            </button>
            <button
              className="vitrina__button vitrina__button--save"
              onClick={submit}
              disabled={!canSubmit || submitting}
              title={
                !isCancel && !canSubmit
                  ? "Измените хотя бы одно поле и укажите корректную сумму"
                  : undefined
              }
            >
              {submitting ? "Отправка…" : "Отправить заявку"}
            </button>
          </div>
        </div>
      </div>
    </ReactPortal>
  );
};

export default FlowChangeRequestModal;
