import { X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import PendingModal from "@features/kassa/ui/PendingModal/PendingModal";

const KassaModals = ({
  showAddCashboxModal, setShowAddCashboxModal, newCashbox, setNewCashbox,
  handleAddCashbox, showEditCashboxModal, setShowEditCashboxModal,
  selectedCashbox, setSelectedCashbox, handleEditCashbox,
  showPending, setShowPending, cashboxDetails, fetchCashboxDetails, id,
}) => (
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
              aria-label="Добавление операции"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vitrina__modal-header">
                <h3>Добавление операции</h3>
                <X
                  className="vitrina__close-icon"
                  size={20}
                  onClick={() => setShowAddCashboxModal(false)}
                />
              </div>
              <div className="vitrina__modal-section">
                <label>Наименование</label>
                <input
                  required
                  type="text"
                  placeholder="Например, Закупка материалов"
                  className="vitrina__modal-input"
                  value={newCashbox.name}
                  onChange={(e) =>
                    setNewCashbox({ ...newCashbox, name: e.target.value })
                  }
                />
              </div>
              <div className="vitrina__modal-section">
                <label>Сумма</label>
                <input
                  type="text"
                  placeholder="Например, 10000"
                  className="vitrina__modal-input"
                  value={newCashbox.amount}
                  onChange={(e) =>
                    setNewCashbox({
                      ...newCashbox,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="vitrina__modal-section">
                <label>Тип операции</label>
                <select
                  className="vitrina__modal-input"
                  value={newCashbox.type}
                  onChange={(e) =>
                    setNewCashbox({ ...newCashbox, type: e.target.value })
                  }
                >
                  <option value="expense">Расход</option>
                  <option value="income">Приход</option>
                </select>
              </div>
              <div className="vitrina__modal-footer">
                <button
                  className="vitrina__button vitrina__button--cancel"
                  onClick={() => setShowAddCashboxModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="vitrina__button vitrina__button--save"
                  onClick={handleAddCashbox}
                >
                  Добавить
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
              aria-label="Редактирование кассы"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vitrina__modal-header">
                <h3>Редактирование кассы</h3>
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
                <label>Название</label>
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
                  Сохранить изменения
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

export default KassaModals;
