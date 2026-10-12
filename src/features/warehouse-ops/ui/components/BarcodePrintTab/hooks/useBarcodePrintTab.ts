import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import JsBarcode from "jsbarcode";
import {
  printXp365bBarcodeLabel,
  attachXp365bUsbListenersOnce,
  checkXp365bConnection,
  connectXp365bManually,
} from "../../../services/xp365bPrintService";
import {
  getBarcodePrintEncoding,
  getProductBarcodes,
} from "@shared/lib/tools/productBarcode";
import {
  loadBarcodePrintSettings,
  saveBarcodePrintSettings,
} from "../barcodePrintTab.storage";
import {
  AVAILABLE_FONTS,
  DEFAULT_PRINT_SETTINGS,
  buildPreviewLayout,
  buildPreviewPositions,
  clamp,
  formatPrice,
  getAutoPrintSettingsBySize,
  getPrinterErrorMessage,
  resolveCurrentLabel,
  wrapPreviewText,
} from "../barcodePrintTab.utils";

/**
 * State and handlers for BarcodePrintTab.
 * No JSX — UI components consume the returned API.
 */
export function useBarcodePrintTab({
  products,
  loading,
}) {
  const [savedPrefs] = useState(loadBarcodePrintSettings);
  const [printingIds, setPrintingIds] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  // Количество копий для каждой позиции отдельно: { [productId]: number }
  const [copiesById, setCopiesById] = useState<any>(() => savedPrefs.copiesById);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showA4Modal, setShowA4Modal] = useState(false);
  const [labelSize, setLabelSize] = useState(savedPrefs.labelSize);
  const [customWidthMm, setCustomWidthMm] = useState(savedPrefs.customWidthMm);
  const [customHeightMm, setCustomHeightMm] = useState(savedPrefs.customHeightMm);
  const [didTouchTextScale, setDidTouchTextScale] = useState(
    savedPrefs.didTouchTextScale,
  );
  const [didTouchBarcodeSize, setDidTouchBarcodeSize] = useState(
    savedPrefs.didTouchBarcodeSize,
  );
  // Что отображать на этикетке (как в печати на A4)
  const [showName, setShowName] = useState(savedPrefs.showName);
  const [showPrice, setShowPrice] = useState(savedPrefs.showPrice);
  const barcodeCanvasRef = useRef<any>(null);

  const defaultSettings = useMemo(() => ({ ...DEFAULT_PRINT_SETTINGS }), []);
  const [printSettings, setPrintSettings] = useState(() => ({
    ...defaultSettings,
    fontId: savedPrefs.fontId,
    textScale: savedPrefs.textScale,
    copies: savedPrefs.copies,
    barcodeHeight: savedPrefs.barcodeHeight,
    barcodeBarWidth: savedPrefs.barcodeBarWidth,
  }));
  const {
    fontId,
    textScale,
    copies,
    lineGap,
    gapAfterTitle,
    gapAfterPrice,
    barcodeRaise,
    barcodeHeight,
    barcodeBarWidth,
  } = printSettings;
  const textScaleValue = Math.max(0.5, Number(textScale) || 1);
  const copiesValue = Math.max(1, Math.min(100, Math.round(Number(copies) || 1)));

  // Копии конкретной позиции: своё значение, иначе общее из шапки
  const getProductCopies = useCallback(
    (id) => {
      const own = copiesById[id];
      if (own === undefined || own === null || own === "") return copiesValue;
      return Math.max(1, Math.min(100, Math.round(Number(own) || 1)));
    },
    [copiesById, copiesValue]
  );

  const setProductCopies = useCallback((id, value) => {
    setCopiesById((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(100, Math.round(Number(value) || 1))),
    }));
  }, []);

  // Какой штрих-код печатать для позиции: { [productId]: barcode }.
  // По умолчанию — основной; товар может иметь ещё и дополнительные.
  // Последний выбор запоминается, чтобы не сбрасывался при уходе со страницы.
  const [barcodeById, setBarcodeById] = useState<any>(() => savedPrefs.barcodeById);

  const getProductBarcodeOptions = useCallback(
    (product) => getProductBarcodes(product),
    []
  );

  /** Выбранный (или основной) штрих-код позиции. */
  const getSelectedBarcode = useCallback(
    (product) => {
      if (!product) return "";
      const options = getProductBarcodes(product);
      const chosen = String(barcodeById[product.id] ?? "").trim();
      if (chosen && options.includes(chosen)) return chosen;
      return options[0] || "";
    },
    [barcodeById]
  );

  const setSelectedBarcode = useCallback((id, barcode) => {
    setBarcodeById((prev) => ({ ...prev, [id]: String(barcode || "") }));
  }, []);

  useEffect(() => {
    saveBarcodePrintSettings({
      labelSize,
      customWidthMm,
      customHeightMm,
      fontId,
      textScale: textScaleValue,
      copies: copiesValue,
      barcodeHeight,
      barcodeBarWidth,
      didTouchTextScale,
      didTouchBarcodeSize,
      showName,
      showPrice,
      barcodeById,
      copiesById,
    });
  }, [
    labelSize,
    customWidthMm,
    customHeightMm,
    fontId,
    textScaleValue,
    copiesValue,
    barcodeHeight,
    barcodeBarWidth,
    didTouchTextScale,
    didTouchBarcodeSize,
    showName,
    showPrice,
    barcodeById,
    copiesById,
  ]);

  const availableFonts = useMemo(() => AVAILABLE_FONTS, []);

  const isRasterFont = String(fontId || "") === "__RASTER__";

  const currentLabel = useMemo(
    () =>
      resolveCurrentLabel({
        labelSize,
        customWidthMm,
        customHeightMm,
      }),
    [labelSize, customWidthMm, customHeightMm]
  );

  // Автоматически подстраиваем параметры под выбранный размер,
  // чтобы на больших этикетках текст реально становился крупнее.
  useEffect(() => {
    const { heightMm } = currentLabel;
    setPrintSettings((prev) => {
      const auto = getAutoPrintSettingsBySize({
        heightMm,
        fontId: prev.fontId,
        base: defaultSettings,
      });

      return {
        ...prev,
        // lineGap и связанные интервалы всегда масштабируем по размеру
        lineGap: auto.lineGap,
        gapAfterTitle: auto.gapAfterTitle,
        gapAfterPrice: auto.gapAfterPrice,
        barcodeRaise: auto.barcodeRaise,

        // размеры штрих-кода авто-масштабируем, только если пользователь их не менял
        ...(didTouchBarcodeSize
          ? null
          : {
              barcodeHeight: auto.barcodeHeight,
              barcodeBarWidth: auto.barcodeBarWidth,
            }),

        // textScale меняем автоматически только если пользователь сам не трогал масштаб
        ...(didTouchTextScale ? null : { textScale: auto.textScale }),
      };
    });
  }, [
    labelSize,
    currentLabel,
    defaultSettings,
    didTouchTextScale,
    didTouchBarcodeSize,
  ]);

  const previewLayout = useMemo(
    () =>
      buildPreviewLayout({
        currentLabel,
        fontId,
        lineGap,
        textScaleValue,
        barcodeHeight,
        isRasterFont,
      }),
    [
      currentLabel.widthMm,
      currentLabel.heightMm,
      lineGap,
      textScaleValue,
      barcodeHeight,
      fontId,
      isRasterFont,
    ]
  );

  const previewWrapWidth = Math.max(6, Math.round(16 / textScaleValue));
  const previewLines = useMemo(
    () =>
      showName
        ? wrapPreviewText(previewProduct?.name || "Товар", previewWrapWidth, 2)
        : [],
    [previewProduct, previewWrapWidth, showName]
  );

  const previewPriceText =
    showPrice &&
    previewProduct?.price !== undefined &&
    previewProduct?.price !== null &&
    String(previewProduct?.price).trim() !== ""
      ? `Цена: ${formatPrice(previewProduct.price)} с`
      : "";

  const previewPositions = useMemo(
    () =>
      buildPreviewPositions({
        previewLinesLength: previewLines.length,
        previewPriceText,
        previewLayout,
        gapAfterTitle,
        gapAfterPrice,
        barcodeRaise,
        barcodeBarWidth,
        barcodeValue: getSelectedBarcode(previewProduct),
      }),
    [
      previewLines.length,
      previewPriceText,
      previewLayout.text.lineGap,
      previewLayout.heightDots,
      previewLayout.border.margin,
      previewLayout.border.thick,
      previewLayout.barcode.height,
      gapAfterTitle,
      gapAfterPrice,
      barcodeRaise,
      previewLayout.widthDots,
      previewProduct,
      barcodeBarWidth,
      getSelectedBarcode,
    ]
  );

  // слушатели USB — один раз
  useEffect(() => {
    attachXp365bUsbListenersOnce();
  }, []);

  // периодическая проверка подключения
  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      try {
        const connected = await checkXp365bConnection();
        if (!cancelled) setIsPrinterConnected(connected);
      } catch {
        if (!cancelled) setIsPrinterConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Список приходит уже отфильтрованным с API (debounce в BarcodePrintPage)
  const filteredProducts = useMemo(
    () => (Array.isArray(products) ? products : []),
    [products]
  );

  // выбранные товары с штрих-кодом (для массовой печати).
  // Штрих-код может быть как основным, так и дополнительным (alternate_barcodes).
  const selectedWithBarcode = useMemo(() => {
    return filteredProducts.filter(
      (p) => selectedIds.has(p.id) && getSelectedBarcode(p)
    );
  }, [filteredProducts, selectedIds, getSelectedBarcode]);

  // Всего этикеток с учётом копий каждой позиции
  const selectedLabelsTotal = useMemo(
    () => selectedWithBarcode.reduce((sum, p) => sum + getProductCopies(p.id), 0),
    [selectedWithBarcode, getProductCopies]
  );

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredProducts.forEach((p) => {
        if (getSelectedBarcode(p)) next.add(p.id);
      });
      return next;
    });
  }, [filteredProducts, getSelectedBarcode]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleConnectPrinter = async () => {
    try {
      setIsConnecting(true);
      await connectXp365bManually();
      const connected = await checkXp365bConnection();
      setIsPrinterConnected(connected);

      if (!connected) {
        alert("Принтер не обнаружен. Убедитесь, что он подключен по USB.");
      }
    } catch (e: any) {
      console.error("Ошибка подключения принтера:", e);
      alert(e?.message || "Не удалось подключиться к принтеру");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOpenPreview = (product) => {
    const bc = getSelectedBarcode(product);
    if (!bc) {
      alert("У товара отсутствует штрих-код");
      return;
    }
    setPreviewProduct(product);
  };

  const handleClosePreview = () => {
    setPreviewProduct(null);
    setIsPrinting(false);
  };

  const handlePrintFromPreview = async () => {
    const previewBarcode = getSelectedBarcode(previewProduct);
    if (!previewBarcode) return;

    const { widthMm, heightMm } = currentLabel;
    const gapTitle = Math.max(0, Math.round(gapAfterTitle));
    const gapPrice = Math.max(0, Math.round(gapAfterPrice));
    const barcodeRaiseDots = Math.max(0, Math.round(barcodeRaise));
    const lineGapDots = Math.max(1, Math.round(lineGap));
    const textScaleForPrint = Math.max(1, Math.round(textScaleValue));
    const barcodeHeightDots = Math.max(1, Math.round(barcodeHeight));
    const barcodeBarWidthDots = Math.max(1, Math.round(barcodeBarWidth));
    const copiesForPrint = getProductCopies(previewProduct.id);

    setIsPrinting(true);
    setPrintingIds((prev) => {
      const next = new Set(prev);
      next.add(previewProduct.id);
      return next;
    });

    try {
      setSelectedBarcode(previewProduct.id, previewBarcode);

      await printXp365bBarcodeLabel({
        barcode: previewBarcode,
        title: showName ? previewProduct.name || "Товар" : "",
        price: showPrice ? previewProduct.price : "",
        copies: copiesForPrint,
        widthMm,
        heightMm,
        gapAfterTitle: gapTitle,
        gapAfterPrice: gapPrice,
        barcodeRaise: barcodeRaiseDots,
        lineGap: lineGapDots,
        textScale: textScaleForPrint,
        fontId,
        barcodeHeight: barcodeHeightDots,
        barcodeBarWidth: barcodeBarWidthDots,
      });

      const connected = await checkXp365bConnection();
      setIsPrinterConnected(connected);

      handleClosePreview();
    } catch (error: any) {
      console.error("Ошибка при печати на XP-365B:", error);

      const connected = await checkXp365bConnection();
      setIsPrinterConnected(connected);

      alert(getPrinterErrorMessage(error));
    } finally {
      setIsPrinting(false);
      setPrintingIds((prev) => {
        const next = new Set(prev);
        next.delete(previewProduct?.id);
        return next;
      });
    }
  };

  const handlePrintSelected = useCallback(async () => {
    if (selectedWithBarcode.length === 0 || !isPrinterConnected) return;

    const { widthMm, heightMm } = currentLabel;
    const gapTitle = Math.max(0, Math.round(gapAfterTitle));
    const gapPrice = Math.max(0, Math.round(gapAfterPrice));
    const barcodeRaiseDots = Math.max(0, Math.round(barcodeRaise));
    const lineGapDots = Math.max(1, Math.round(lineGap));
    const textScaleForPrint = Math.max(1, Math.round(textScaleValue));
    const barcodeHeightDots = Math.max(1, Math.round(barcodeHeight));
    const barcodeBarWidthDots = Math.max(1, Math.round(barcodeBarWidth));

    setIsBatchPrinting(true);
    setPrintingIds((prev) => {
      const next = new Set(prev);
      selectedWithBarcode.forEach((p) => next.add(p.id));
      return next;
    });

    let printed = 0;
    let printedLabels = 0;
    const total = selectedWithBarcode.length;
    const totalLabelsPlanned = selectedWithBarcode.reduce(
      (sum, p) => sum + getProductCopies(p.id),
      0
    );

    try {
      for (const product of selectedWithBarcode) {
        const productCopies = getProductCopies(product.id);
        const productBarcode = getSelectedBarcode(product);
        setSelectedBarcode(product.id, productBarcode);
        await printXp365bBarcodeLabel({
          barcode: productBarcode,
          title: showName ? product.name || "Товар" : "",
          price: showPrice ? product.price : "",
          copies: productCopies,
          widthMm,
          heightMm,
          gapAfterTitle: gapTitle,
          gapAfterPrice: gapPrice,
          barcodeRaise: barcodeRaiseDots,
          lineGap: lineGapDots,
          textScale: textScaleForPrint,
          fontId,
          barcodeHeight: barcodeHeightDots,
          barcodeBarWidth: barcodeBarWidthDots,
        });
        printed += 1;
        printedLabels += productCopies;
        setPrintingIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }

      const connected = await checkXp365bConnection();
      setIsPrinterConnected(connected);
      setSelectedIds(new Set());
      if (printed === total) {
        alert(
          printedLabels > printed
            ? `Напечатано: ${printed} товаров, ${printedLabels} этикеток (с учётом копий)`
            : `Напечатано этикеток: ${printed}`
        );
      }
    } catch (error: any) {
      console.error("Ошибка при массовой печати:", error);
      const connected = await checkXp365bConnection();
      setIsPrinterConnected(connected);
      const errorMessage = getPrinterErrorMessage(error);
      alert(
        totalLabelsPlanned > total
          ? `${errorMessage}\nНапечатано до ошибки: ${printed} из ${total} товаров (${printedLabels} из ${totalLabelsPlanned} этикеток)`
          : `${errorMessage}\nНапечатано до ошибки: ${printed} из ${total}`
      );
    } finally {
      setIsBatchPrinting(false);
      setPrintingIds((prev) => {
        const next = new Set(prev);
        selectedWithBarcode.forEach((p) => next.delete(p.id));
        return next;
      });
    }
  }, [
    selectedWithBarcode,
    isPrinterConnected,
    currentLabel,
    getProductCopies,
    gapAfterTitle,
    gapAfterPrice,
    barcodeRaise,
    lineGap,
    textScaleValue,
    barcodeHeight,
    barcodeBarWidth,
    fontId,
    showName,
    showPrice,
    getSelectedBarcode,
    setSelectedBarcode,
  ]);

  // Генерация визуализации штрих-кода для предпросмотра
  useEffect(() => {
    if (!previewProduct || !barcodeCanvasRef.current) return;

    const canvas = barcodeCanvasRef.current;
    const barcode = getSelectedBarcode(previewProduct);
    if (!barcode) return;

    let printCode;
    let printFormat;
    try {
      const encoded = getBarcodePrintEncoding(barcode);
      printCode = encoded.code;
      printFormat = encoded.format;
    } catch {
      printCode = barcode.replace(/\D/g, "") || barcode;
      printFormat = "CODE128";
    }

    const { scale, barcode: barcodeLayout } = previewLayout;
    const lineGapDots = Math.max(1, Math.round(lineGap));
    const textScaleInt = Math.max(1, Math.round(textScaleValue));
    const autoBarcodeFontDots = isRasterFont
      ? Math.max(8, Math.round(lineGapDots * 0.72 * textScaleInt))
      : Math.round(10 * textScaleValue);
    const extraBelowBarcodeDots = Math.max(18, autoBarcodeFontDots + 8);
    const barcodeCanvasWidth = Math.round(previewLayout.widthDots * scale);
    const barcodeCanvasHeight = Math.round(
      (barcodeLayout.height + extraBelowBarcodeDots) * scale
    );

    canvas.width = barcodeCanvasWidth;
    canvas.height = barcodeCanvasHeight;

    try {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const jsFormat =
        printFormat === "EAN8"
          ? "EAN8"
          : printFormat === "EAN13"
            ? "EAN13"
            : "CODE128";

      const barWidth = Math.max(1, Math.round(barcodeBarWidth * scale));
      const barHeight = Math.round(barcodeLayout.height * scale);

      JsBarcode(canvas, printCode, {
        format: jsFormat,
        width: barWidth,
        height: barHeight,
        displayValue: true,
        fontSize: Math.round(autoBarcodeFontDots * scale),
        textMargin: Math.round(2 * scale),
        margin: 0,
        background: "transparent",
        lineColor: "#000000",
      });
    } catch (error: any) {
      console.error("Ошибка генерации штрих-кода:", error);

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(printCode, canvas.width / 2, canvas.height / 2);
    }
  }, [
    previewProduct,
    previewLayout,
    barcodeBarWidth,
    lineGap,
    textScaleValue,
    isRasterFont,
    getSelectedBarcode,
  ]);

  const hasProducts = Array.isArray(products) && products.length > 0;
  const isInitialLoading = Boolean(loading) && !hasProducts;
  const isContentRefreshing = Boolean(loading) && hasProducts;

  const handleLabelSizeChange = useCallback((value) => {
    setLabelSize(value);
    setDidTouchTextScale(false);
    setDidTouchBarcodeSize(false);
  }, []);

  const handleBarcodeHeightChange = useCallback((value) => {
    setDidTouchBarcodeSize(true);
    setPrintSettings((prev) => ({
      ...prev,
      barcodeHeight: clamp(Number(value) || 44, 20, 200),
    }));
  }, []);

  const handleBarcodeBarWidthChange = useCallback((value) => {
    setDidTouchBarcodeSize(true);
    setPrintSettings((prev) => ({
      ...prev,
      barcodeBarWidth: Number(value) || 2,
    }));
  }, []);

  const handleFontIdChange = useCallback((value) => {
    setPrintSettings((prev) => ({
      ...prev,
      fontId: value,
    }));
  }, []);

  const handleTextScaleChange = useCallback((value) => {
    setDidTouchTextScale(true);
    setPrintSettings((prev) => ({
      ...prev,
      textScale: Number(value),
    }));
  }, []);

  const handleCopiesChange = useCallback((value) => {
    setPrintSettings((prev) => ({
      ...prev,
      copies: value,
    }));
  }, []);

  const resetCopiesById = useCallback(() => {
    setCopiesById({});
  }, []);

  const a4ModalProducts = useMemo(() => {
    return (selectedWithBarcode.length > 0
      ? selectedWithBarcode
      : filteredProducts.filter((p) => getSelectedBarcode(p))
    ).map((p) => ({
      ...p,
      // Печатаем выбранный код позиции (основной или дополнительный)
      barcode: getSelectedBarcode(p),
      __copies: getProductCopies(p.id),
    }));
  }, [
    selectedWithBarcode,
    filteredProducts,
    getSelectedBarcode,
    getProductCopies,
  ]);

  return {
    // loading / list
    filteredProducts,
    isInitialLoading,
    isContentRefreshing,
    printingIds,
    selectedIds,
    copiesById,
    isBatchPrinting,
    selectedWithBarcode,
    selectedLabelsTotal,

    // printer
    isPrinterConnected,
    isConnecting,
    handleConnectPrinter,

    // label size / copies
    labelSize,
    customWidthMm,
    customHeightMm,
    setCustomWidthMm,
    setCustomHeightMm,
    handleLabelSizeChange,
    copiesValue,
    handleCopiesChange,
    resetCopiesById,
    getProductCopies,
    setProductCopies,

    // display / barcode settings
    showName,
    setShowName,
    showPrice,
    setShowPrice,
    barcodeHeight,
    barcodeBarWidth,
    handleBarcodeHeightChange,
    handleBarcodeBarWidthChange,

    // selection / print actions
    toggleSelection,
    selectAllOnPage,
    clearSelection,
    handlePrintSelected,
    handleOpenPreview,
    getProductBarcodeOptions,
    getSelectedBarcode,
    setSelectedBarcode,

    // A4 modal
    showA4Modal,
    setShowA4Modal,
    a4ModalProducts,

    // preview modal
    previewProduct,
    isPrinting,
    handleClosePreview,
    handlePrintFromPreview,
    barcodeCanvasRef,
    previewLayout,
    previewLines,
    previewPriceText,
    previewPositions,
    availableFonts,
    fontId,
    textScaleValue,
    handleFontIdChange,
    handleTextScaleChange,
  };
}
