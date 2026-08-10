/**
 * Motion tokens for JS (optional). Prefer CSS variables in styles.
 * Keep in sync with src/shared/styles/tokens.css
 */
export const motion = {
  durationFast: 140,
  durationNormal: 220,
  durationSlow: 340,
  easeStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeEnter: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeExit: "cubic-bezier(0.4, 0, 1, 1)",
  easeEmphasized: "cubic-bezier(0.2, 0, 0, 1)",
  distance: 8,
  distanceSm: 4,
  pressScale: 0.98,
};

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default motion;
