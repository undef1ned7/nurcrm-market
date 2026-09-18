import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  Info,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  deleteCashBox,
  bulkDeleteCashBoxes,
  selectMergeCandidates,
  mergeRoleMismatchWarning,
  cashboxDeleteErrorMessage,
  cashboxRoleLabel,
} from "@entities/cash";
import { useAppDispatch } from "@app/store";
import ReactPortal from "@shared/ui/Portal/ReactPortal";

const nameOf = (c: any) => c?.department_name || c?.name || "—";

export type DeleteCashboxModalProps = {
  /** Кассы к удалению — одна (единичное удаление) или несколько (массовое). */
  targets: any[];
  /** Все кассы компании — источник кандидатов на наследование. */
  allCashboxes: any[];
  onClose: () => void;
  /** Вызывается после успешного (в т.ч. частично) удаления. */
  onDone: () => void;
};

/**
 * Подтверждение удаления кассы (или нескольких) с опцией «Наследовать отчёт».
 * При выбранном наследнике BE переносит движения удаляемых касс в него перед
 * архивацией — история не теряется, отчёт наследника продолжает расти с той
 * же суммы. Без наследника — прежнее поведение (чистый архив).
 * @see docs/backend/kassa/cashbox-delete-backend.md §«Наследование отчёта»
 */
const DeleteCashboxModal = ({
  targets,
  allCashboxes,
  onClose,
  onDone,
}: DeleteCashboxModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const tt = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback }) as string;

  const candidates = useMemo(
    () => selectMergeCandidates(targets, allCashboxes),
    [targets, allCashboxes],
  );
  const sameRoleCandidates = useMemo(() => {
    const targetRoles = new Set(
      targets.map((c) => c?.role).filter((r) => r != null),
    );
    return candidates.filter((c: any) => targetRoles.has(c?.role));
  }, [candidates, targets]);

  // По умолчанию: ровно один кандидат той же роли → сразу предлагаем
  // наследование в него («после удаления одной кассы вторая должна
  // наследовать отчёт»). Несколько/ноль кандидатов — не наследуем, пока не выберут явно.
  const defaultTargetId =
    sameRoleCandidates.length === 1 ? String((sameRoleCandidates[0] as any).id) : "";

  const [inherit, setInherit] = useState(Boolean(defaultTargetId));
  const [mergeInto, setMergeInto] = useState<string>(defaultTargetId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  const mergeTarget = candidates.find((c: any) => String(c.id) === mergeInto) as any;
  const roleWarning =
    inherit && mergeTarget ? mergeRoleMismatchWarning(targets, mergeTarget, tt) : null;

  const title =
    targets.length > 1
      ? tt("crm.kassa.delete.modal.titleBulk", "Удалить кассы ({{count}})").replace(
          "{{count}}",
          String(targets.length),
        )
      : tt("crm.kassa.delete.modal.titleSingle", "Удалить кассу");

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const effectiveMergeInto = inherit && mergeInto ? mergeInto : null;
    try {
      if (targets.length === 1) {
        await dispatch(
          deleteCashBox({ id: targets[0].id, mergeInto: effectiveMergeInto }),
        ).unwrap();
        setResult({ ok: 1, failed: 0 });
      } else {
        const { succeeded, failed } = await dispatch(
          bulkDeleteCashBoxes({
            ids: targets.map((c) => c.id),
            mergeInto: effectiveMergeInto,
          }),
        ).unwrap();
        setResult({ ok: succeeded.length, failed: failed.length });
        if (failed.length && succeeded.length === 0) {
          setError(cashboxDeleteErrorMessage(failed[0].error, tt));
        }
      }
      onDone();
    } catch (e: any) {
      setError(cashboxDeleteErrorMessage(e, tt));
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle =
    targets.length > 1
      ? tt(
          "crm.kassa.delete.modal.subtitleBulk",
          "Действие необратимо для истории — проверьте список перед подтверждением",
        )
      : tt(
          "crm.kassa.delete.modal.subtitleSingle",
          "Кассу можно будет только восстановить из архива вручную",
        );

  return (
    <ReactPortal wrapperId="kassa-delete-cashbox-modal">
      <div
        className="kassa-modal__overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="kassa-modal__card kassa-modal__card--danger"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="kassa-modal__header">
            <div className="kassa-modal__heading">
              <span className="kassa-modal__heading-icon kassa-modal__heading-icon--danger">
                <AlertTriangle size={20} />
              </span>
              <div className="kassa-modal__heading-text">
                <h3 className="kassa-modal__title">{title}</h3>
                <p className="kassa-modal__subtitle">{subtitle}</p>
              </div>
            </div>
            <button
              className="kassa-modal__close"
              onClick={onClose}
              aria-label={t("common.close")}
              disabled={submitting}
            >
              <X size={18} />
            </button>
          </div>

          <div className="kassa-modal__section">
            <label className="kassa-modal__label">
              {tt("crm.kassa.delete.modal.targetsLabel", "Кассы к удалению")}
            </label>
            <ul className="kassa-modal__targets">
              {targets.map((c) => (
                <li key={c.id} className="kassa-modal__target-row">
                  <span className="kassa-modal__target-icon">
                    <Wallet size={16} />
                  </span>
                  <span className="kassa-modal__target-name">{nameOf(c)}</span>
                  {cashboxRoleLabel(c) && (
                    <span className="kassa-modal__target-role">
                      {cashboxRoleLabel(c)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {candidates.length > 0 ? (
            <>
              <div className="kassa-modal__section">
                <label
                  htmlFor="cashbox-inherit-checkbox"
                  className="kassa-modal__toggle-row"
                >
                  <span className="kassa-modal__toggle-row-text">
                    <ArrowRightLeft size={16} />
                    {tt(
                      "crm.kassa.delete.modal.inheritLabel",
                      "Наследовать отчёт",
                    )}
                  </span>
                  <span
                    className={`kassa-modal__switch${
                      inherit ? " kassa-modal__switch--on" : ""
                    }`}
                  >
                    <input
                      id="cashbox-inherit-checkbox"
                      type="checkbox"
                      checked={inherit}
                      onChange={(e) => setInherit(e.target.checked)}
                    />
                    <span className="kassa-modal__switch-knob" />
                  </span>
                </label>
              </div>

              {inherit && (
                <div className="kassa-modal__section kassa-modal__section--nested">
                  <label className="kassa-modal__label">
                    {tt(
                      "crm.kassa.delete.modal.inheritTargetLabel",
                      "В какую кассу перенести историю",
                    )}
                  </label>
                  <div className="kassa-modal__select-wrap">
                    <select
                      className="kassa-modal__select"
                      value={mergeInto}
                      onChange={(e) => setMergeInto(e.target.value)}
                    >
                      <option value="">
                        {tt(
                          "crm.kassa.delete.modal.selectPlaceholder",
                          "— выбрать кассу —",
                        )}
                      </option>
                      {candidates.map((c: any) => (
                        <option key={c.id} value={String(c.id)}>
                          {nameOf(c)}
                          {cashboxRoleLabel(c) ? ` (${cashboxRoleLabel(c)})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="kassa-modal__select-caret"
                    />
                  </div>
                  <p className="kassa-modal__hint">
                    <Info size={14} className="kassa-modal__hint-icon" />
                    {tt(
                      "crm.kassa.delete.modal.inheritHint",
                      "Движения удаляемых касс перейдут в выбранную — её отчёт продолжит расти с учётом этой истории. Сами кассы уйдут в архив, а не удалятся физически.",
                    )}
                  </p>
                  {roleWarning && (
                    <p className="kassa-modal__hint kassa-modal__hint--warning">
                      <AlertTriangle size={14} className="kassa-modal__hint-icon" />
                      {roleWarning}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="kassa-modal__section">
              <p className="kassa-modal__hint">
                <Info size={14} className="kassa-modal__hint-icon" />
                {tt(
                  "crm.kassa.delete.modal.noCandidates",
                  "Других активных касс нет — наследовать отчёт некуда, касса будет просто заархивирована.",
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="kassa-modal__section">
              <div className="kassa__alert kassa__alert--error" role="alert">
                <AlertTriangle size={16} className="kassa__alert-icon" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {result && (
            <div className="kassa-modal__section">
              <div className="kassa__alert kassa__alert--info" role="status">
                <CheckCircle2 size={16} className="kassa__alert-icon" />
                <span>
                  {targets.length > 1
                    ? tt(
                        "crm.kassa.delete.modal.bulkResult",
                        "Удалено: {{ok}} из {{total}}",
                      )
                        .replace("{{ok}}", String(result.ok))
                        .replace("{{total}}", String(targets.length))
                    : tt("crm.kassa.delete.done", "Касса удалена")}
                </span>
              </div>
            </div>
          )}

          <div className="kassa-modal__footer">
            <button
              className="nur-btn nur-btn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.close")}
            </button>
            {!result && (
              <button
                className="nur-btn nur-btn--danger"
                onClick={submit}
                disabled={submitting || (inherit && candidates.length > 0 && !mergeInto)}
              >
                {submitting ? (
                  <span className="kassa-modal__spinner" aria-hidden="true" />
                ) : (
                  <Trash2 size={16} />
                )}
                {submitting
                  ? tt("crm.kassa.delete.modal.submitting", "Удаление…")
                  : t("common.delete")}
              </button>
            )}
          </div>
        </div>
      </div>
    </ReactPortal>
  );
};

export default DeleteCashboxModal;
