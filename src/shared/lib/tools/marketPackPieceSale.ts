export const supportsPieceFromPack = (product: any) =>
  Array.isArray(product?.packages) && product.packages.length > 0;

export function getDefaultPackage(product: any) {
  const pkgs = product?.packages;
  if (!Array.isArray(pkgs) || !pkgs.length) return null;
  return (
    pkgs.find((pkg) => Number(pkg?.quantity_in_package) > 0) || pkgs[0] || null
  );
}

export function pieceUnitPrice(product: any, pkg: any) {
  if (pkg?.piece_unit_price != null && pkg.piece_unit_price !== "") {
    return Number(pkg.piece_unit_price);
  }
  const ipp = Number(pkg?.quantity_in_package);
  if (ipp > 0) return Number(product?.price || 0) / ipp;
  return Number(product?.price || 0);
}

export function piecePurchasePrice(product: any, pkg: any) {
  const ipp = Number(pkg?.quantity_in_package);
  if (ipp <= 0) return Number(product?.purchase_price || 0);
  return Number(product?.purchase_price || 0) / ipp;
}

export function consumePacks(qty: any, salePackageId: any, packages: any) {
  const q = Number(qty);
  if (!salePackageId) return q;
  const pkg = (packages || []).find((p: any) => p.id === salePackageId);
  const ipp = Number(pkg?.quantity_in_package ?? 0);
  if (ipp <= 0) throw new Error("quantity_in_package must be > 0");
  return Math.round((q / ipp) * 1000) / 1000;
}

export function maxPiecesAvailable(stockPacks: any, otherConsumePacks: any, pkg: any) {
  const ipp = Number(pkg?.quantity_in_package);
  const freePacks = Math.max(0, Number(stockPacks) - otherConsumePacks);
  return Math.floor(freePacks * ipp);
}

/** null = пачка/учётная единица; uuid = поштучная продажа */
export const normalizeCartLineSalePackage = (salePackage: any) => {
  if (salePackage == null || salePackage === "") return null;
  return String(salePackage);
};

export const isPieceSaleCartLine = (item: any) =>
  normalizeCartLineSalePackage(item?.salePackage ?? item?.sale_package) != null;

/** Совпадение строки корзины по (product, sale_package) */
export const cartLinesMatchProductAndPackage = (line: any, productId: any, salePackageId: any) => {
  const lineProductId = line?.product ?? line?.product_id;
  if (String(lineProductId) !== String(productId)) return false;
  return (
    normalizeCartLineSalePackage(line?.sale_package ?? line?.salePackage) ===
    normalizeCartLineSalePackage(salePackageId)
  );
};

export const formatCartLineNameSuffix = (item: any) =>
  isPieceSaleCartLine(item) ? " (штуч)" : "";

export function cartItemUnitLabel(item: any, product: any) {
  if (item?.salePackage || item?.sale_package) {
    const salePackageId = item.salePackage || item.sale_package;
    const pkg = product?.packages?.find((p: any) => p.id === salePackageId);
    return pkg?.unit || "шт.";
  }
  return product?.unit || item?.unit || "шт.";
}

export function formatCartItemSubtitle(item: any, product: any) {
  const unit = cartItemUnitLabel(item, product);
  return `${item.quantity} ${unit} × ${item.unit_price ?? item.price}`;
}
