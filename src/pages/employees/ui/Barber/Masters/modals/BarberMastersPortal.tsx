import { useEffect } from "react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";

/**
 * Renders barbermasters overlays on document.body so `position: fixed`
 * is not trapped by `.nur-route-enter` transform animations.
 *
 * onEscape — закрытие по Escape (раньше модалки сотрудников с клавиатуры не закрывались).
 * Не срабатывает, если поверх открыт другой диалог вне этой модалки.
 */
export default function BarberMastersPortal({
  children,
  wrapperId = "barbermasters-modal",
  onEscape,
}: {
  children: any;
  wrapperId?: string;
  onEscape?: () => void;
}) {
  useEffect(() => {
    if (!onEscape) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const wrapper = document.getElementById(wrapperId);
      const otherDialogOpen = Array.from(
        document.querySelectorAll('[role="dialog"]'),
      ).some((d) => !wrapper?.contains(d));
      if (otherDialogOpen) return;
      onEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEscape, wrapperId]);

  return <ReactPortal wrapperId={wrapperId}>{children}</ReactPortal>;
}
