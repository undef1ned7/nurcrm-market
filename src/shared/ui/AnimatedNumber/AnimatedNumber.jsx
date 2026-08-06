import { useEffect, useRef, useState } from "react";
import { motion, prefersReducedMotion } from "@shared/lib/motion";

/**
 * Count-up for important KPI numbers only.
 * Pass a numeric `value` and optional `format` (receives number, returns string).
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 600,
  className = "",
}) {
  const target = Number(value);
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [display, setDisplay] = useState(safeTarget);
  const fromRef = useRef(safeTarget);
  const rafRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = safeTarget;
      setDisplay(safeTarget);
      return undefined;
    }

    const from = fromRef.current;
    const start = performance.now();
    const ms = Math.min(duration, 800);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (safeTarget - from) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = safeTarget;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [safeTarget, duration]);

  return (
    <span className={className} data-motion-ms={motion.durationSlow}>
      {format(display)}
    </span>
  );
}

export default AnimatedNumber;
