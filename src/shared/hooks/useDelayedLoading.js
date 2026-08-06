import { useEffect, useState } from "react";

/**
 * Delays showing a loading UI so fast requests don't flash a spinner/skeleton.
 * @param {boolean} loading
 * @param {number} [delayMs=180]
 */
export function useDelayedLoading(loading, delayMs = 180) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return undefined;
    }
    const id = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(id);
  }, [loading, delayMs]);

  return show;
}

export default useDelayedLoading;
