import { useEffect } from "react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";

/**
 * Renders ClientDetails (.cmx) overlays on document.body so
 * `position: fixed` is not trapped by `.nur-route-enter` transforms.
 *
 * onEscape — закрытие по Escape (раньше модалки карточки клиента не закрывались
 * с клавиатуры). Не срабатывает, если поверх открыт другой диалог (подтверждение,
 * ошибка): его Escape закрывает сам.
 */
export default function ClientModalPortal({
  children,
  wrapperId = "client-details-modal",
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
