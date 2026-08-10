import React from "react";
import { Check, ListOrdered, Plus, Tags, X } from "lucide-react";
/* =========================
   3) ManualList
   ========================= */
export const ManualList = React.memo(function ManualList({
  items = [],
  inline,
  quantity,
  discount,
  onSearch,
  setQuantity,
  setDiscount,
  saveInline,
  setInline,
  addOne,
  isOutOfStock,
}: any) {
  const list = Array.isArray(items)
    ? items
    : Array.isArray(items?.results)
    ? items.results
    : [];

  const getItemId = (p: any) => p?.id ?? p?.product;
  const getItemName = (p: any) => p?.name ?? p?.product_name ?? "";
  const getItemQty = (p: any) =>
    p?.qty_on_agent ?? p?.qty_on_hand ?? p?.quantity ?? p?.stock ?? 0;

  return (
    <div className="sell__manual">
      <input
        type="text"
        placeholder="Введите название товара"
        className="add-modal__input"
        name="search"
        onChange={onSearch}
      />
      <ul className="sell__list">
        {list.map((p: any) => {
          const pid = getItemId(p);
          return (
            <li key={pid}>
              <div style={{ display: "flex", columnGap: "10px" }}>
                <p>{getItemName(p)}</p>
                <p>{getItemQty(p)}</p>
              </div>
              <div className="sell__list-row">
                {isOutOfStock(p) ? (
                  <div className="sell__empty">
                    <span className="sell__badge--danger">Нет в наличии</span>
                  </div>
                ) : inline.id === pid && inline.field === "quantity" ? (
                  <>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e: any) => setQuantity(e.target.value)}
                      placeholder="Количество"
                    />
                    <button type="button" onClick={() => saveInline(pid)}>
                      <Check />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInline({ id: null, field: null })}
                    >
                      <X />
                    </button>
                  </>
                ) : inline.id === pid && inline.field === "discount" ? (
                  <>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e: any) => setDiscount(e.target.value)}
                      placeholder="Скидка (сом)"
                    />
                    <button type="button" onClick={() => saveInline(pid)}>
                      <Check />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInline({ id: null, field: null })}
                    >
                      <X />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setInline({ id: pid, field: "discount" })}
                    >
                      <Tags />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInline({ id: pid, field: "quantity" })}
                    >
                      <ListOrdered />
                    </button>
                    <button type="button" onClick={() => addOne(pid)}>
                      <Plus size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

