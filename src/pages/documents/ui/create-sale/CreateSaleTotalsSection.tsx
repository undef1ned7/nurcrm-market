import { formatPrice } from "./utils";

const CreateSaleTotalsSection = ({
  totals,
  documentDiscount,
  setDocumentDiscount,
  comment,
  setComment,
}) => (
  <>
    <div className="create-sale-document__totals">
      <div className="create-sale-document__total-row">
        <span>Итог:</span>
        <span>{formatPrice(totals.total)} сом</span>
      </div>
      <div className="create-sale-document__total-row">
        <span>Оплаченные:</span>
        <span>{formatPrice(totals.paid)} сом</span>
      </div>
      <div className="create-sale-document__total-row">
        <span>Скидка по документу:</span>
        <div className="create-sale-document__discount-input-wrapper">
          <input
            type="text"
            min="0"
            max="100"
            value={documentDiscount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setDocumentDiscount("");
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                  setDocumentDiscount(value);
                }
              }
            }}
            onBlur={(e) => {
              const value = e.target.value;
              if (
                value === "" ||
                value === null ||
                isNaN(Number(value))
              ) {
                setDocumentDiscount("0");
              } else {
                const numValue = Number(value);
                if (numValue < 0) {
                  setDocumentDiscount("0");
                } else if (numValue > 100) {
                  setDocumentDiscount("100");
                } else {
                  setDocumentDiscount(String(numValue));
                }
              }
            }}
            className="create-sale-document__discount-input"
          />
          <span>%</span>
        </div>
      </div>
      <div className="create-sale-document__total-row">
        <span>Общая скидка:</span>
        <span>
          {documentDiscount > 0 || totals.itemsDiscount > 0
            ? `${(
                (totals.totalDiscount / totals.subtotal) *
                100
              ).toFixed(2)}% (${formatPrice(totals.totalDiscount)} сом)`
            : `% (${formatPrice(0)} сом)`}
        </span>
      </div>
    </div>

    <div className="create-sale-document__comment-section">
      <label className="nur-label create-sale-document__comment-label">
        Комментарий
      </label>
      <textarea
        className="nur-textarea create-sale-document__comment-textarea"
        placeholder="Введите комментарий..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
      />
    </div>
  </>
);

export default CreateSaleTotalsSection;
