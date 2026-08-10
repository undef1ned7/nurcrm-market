
export const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPrice = (price) => {
  return Number(price || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const downloadBlob = (blob, filename) => {
  if (typeof window === "undefined" || !window.URL || !window.document) {
    throw new Error("Браузерное окружение недоступно");
  }
  const url = window.URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const computeCartTotals = (cartItems, documentDiscount, isDocumentPosted) => {
  const subtotal = (cartItems || []).reduce((sum, item) => {
    const price = Number(item.price || item.unit_price || 0);
    const qty = Number(item.quantity || 0);
    const itemDiscount = Number(item.discount_percent || item.discount || 0);
    const line = price * qty;
    return sum + line - (line * itemDiscount) / 100;
  }, 0);
  const discountPercent = Number(documentDiscount) || 0;
  const totalDiscount = isDocumentPosted
    ? 0
    : (subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - totalDiscount);
  return { subtotal, totalDiscount, total, discountPercent };
};

export const updateCartItemQuantity = (cartItems, itemId, newQuantity) => {
  const qty = Number(newQuantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return (cartItems || []).filter((item) => item.id !== itemId);
  }
  return (cartItems || []).map((item) =>
    item.id === itemId ? { ...item, quantity: qty } : item,
  );
};

export const removeCartItem = (cartItems, itemId) =>
  (cartItems || []).filter((item) => item.id !== itemId);
