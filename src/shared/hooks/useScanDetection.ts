import useScanDetectionImport from "use-scan-detection";

/**
 * Vite 8 / ESM interop: CJS package may expose `{ default: fn }` as the
 * module namespace instead of unwrapping the default export.
 */
const useScanDetection: any =
  typeof useScanDetectionImport === "function"
    ? useScanDetectionImport
    : (useScanDetectionImport as any)?.default;

export default useScanDetection;
