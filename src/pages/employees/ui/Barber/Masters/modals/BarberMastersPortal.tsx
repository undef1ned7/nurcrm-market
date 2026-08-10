import ReactPortal from "@shared/ui/Portal/ReactPortal";

/**
 * Renders barbermasters overlays on document.body so `position: fixed`
 * is not trapped by `.nur-route-enter` transform animations.
 */
export default function BarberMastersPortal({
  children,
  wrapperId = "barbermasters-modal",
}) {
  return <ReactPortal wrapperId={wrapperId}>{children}</ReactPortal>;
}
