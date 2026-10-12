import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import PendingModal from "@features/kassa/ui/PendingModal/PendingModal";
import { isAmountDraft } from "../hooks/kassaUtils";

const KassaModals = ({
  showAddCashboxModal, setShowAddCashboxModal, newCashbox, setNewCashbox,
  handleAddCashbox, addingOperation = false, showEditCashboxModal, setShowEditCashboxModal,
  selectedCashbox, setSelectedCashbox, handleEditCashbox,
  showPending, setShowPending, cashboxDetails, fetchCashboxDetails, id,
}) => {
  const { t } = useTranslation();
  const tw = (k: string): string => t(`crm.kassa.worker.${k}`) as string;
  return (
  <>
      {showAddCashboxModal && (
        <ReactPortal wrapperId="kassa-add-operation-modal">
          <div
            className="vitrina__overlay"
            role="presentation"
            onClick={() => setShowAddCashboxModal(false)}
          >
            <div
              className="vitrina__modal vitrina__modal--add"
              role="dialog"
              aria-modal="true"
              aria-label={tw("addOperationTitle")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vitrina__modal-header">
                <h3>{tw("addOperationTitle")}</h3>
                <X
                  className="vitrina__close-icon"
                  size={20}
                  onClick={() => setShowAddCashboxModal(false)}
                />
              </div>
              <div className="vitrina__modal-section">
                <label htmlFor="kassa-op-name">{tw("nameLabel")}</label>
                <input
                  id="kassa-op-name"
                  required
                  type="text"
                  placeholder={tw("namePlaceholderOp")}
                  className="vitrina__modal-input"
                  value={newCashbox.name}
                  onChange={(e) =>
                    setNewCashbox({ ...newCashbox, name: e.target.value })
                  }
                />
              </div>
              <div className="vitrina__modal-section">
                <label htmlFor="kassa-op-amount">{t("common.amount")}</label>
                <input
                  id="kassa-op-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder={tw("amountPlaceholder")}
                  className="vitrina__modal-input"
                  value={newCashbox.amount}
                  onChange={(e) => {
                    // Храним строку как ввёл пользователь («15.» → «15.5»); минус, буквы и
                    // больше двух знаков после разделителя не принимаем.
                    const value = e.target.value.replace(/\s/g, "");
                    if (!isAmountDraft(value)) return;
                    setNewCashbox({ ...newCashbox, amount: value });
                  }}
                />
              </div>
              <div className="vitrina__modal-section">
                <label htmlFor="kassa-op-type">{tw("operationType")}</label>
                <select
                  id="kassa-op-type"
                  className="vitrina__modal-input"
                  value={newCashbox.type}
                  onChange={(e) =>
                    setNewCashbox({ ...newCashbox, type: e.target.value })
                  }
                >
                  <option value="expense">{t("crm.kassa.expense")}</option>
                  <option value="income">{t("crm.kassa.income")}</option>
                </select>
              </div>
              <div className="vitrina__modal-footer">
                <button
                  className="vitrina__button vitrina__button--cancel"
                  onClick={() => setShowAddCashboxModal(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="vitrina__button vitrina__button--save"
                  onClick={handleAddCashbox}
                  disabled={addingOperation}
                  aria-busy={addingOperation}
                >
                  {tw("addBtn")}
                </button>
              </div>
            </div>
          </div>
        </ReactPortal>
      )}

      {showEditCashboxModal && selectedCashbox && (
        <ReactPortal wrapperId="kassa-edit-modal">
          <div
            className="vitrina__overlay"
            role="presentation"
            onClick={() => setShowEditCashboxModal(false)}
          >
            <div
              className="vitrina__modal vitrina__modal--edit"
              role="dialog"
              aria-modal="true"
              aria-label={tw("editCashboxTitle")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vitrina__modal-header">
                <h3>{tw("editCashboxTitle")}</h3>
                <X
                  className="vitrina__close-icon"
                  size={20}
                  onClick={() => setShowEditCashboxModal(false)}
                />
              </div>
              <div className="vitrina__modal-section">
                <label>ID</label>
                <input
                  type="text"
                  value={selectedCashbox.id || ""}
                  readOnly
                  className="vitrina__modal-input"
                />
              </div>
              <div className="vitrina__modal-section">
                <label>{t("common.name")}</label>
                <input
                  type="text"
                  value={selectedCashbox.title || ""}
                  onChange={(e) =>
                    setSelectedCashbox({
                      ...selectedCashbox,
                      title: e.target.value,
                    })
                  }
                  className="vitrina__modal-input"
                />
              </div>
              <div className="vitrina__modal-footer">
                <button
                  className="vitrina__button vitrina__button--save"
                  onClick={handleEditCashbox}
                >
                  {tw("saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </ReactPortal>
      )}
      {showPending && (
        <PendingModal
          onClose={() => setShowPending(false)}
          cashName={cashboxDetails.department_name ?? cashboxDetails.name}
          onChanged={() => fetchCashboxDetails(id)}
        />
      )}
  </>
  );
};

export default KassaModals;
