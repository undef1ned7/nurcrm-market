import useScanDetectionImport from "use-scan-detection";

/**
 * Vite 8 / ESM interop: CJS package may expose `{ default: fn }` as the
 * module namespace instead of unwrapping the default export.
 */
const useScanDetection =
  typeof useScanDetectionImport === "function"
    ? useScanDetectionImport
    : useScanDetectionImport?.default;

export default useScanDetection;
