import ReactPortal from "@shared/ui/Portal/ReactPortal";

/**
 * Renders ClientDetails (.cmx) overlays on document.body so
 * `position: fixed` is not trapped by `.nur-route-enter` transforms.
 */
export default function ClientModalPortal({
  children,
  wrapperId = "client-details-modal",
}) {
  return <ReactPortal wrapperId={wrapperId}>{children}</ReactPortal>;
}
