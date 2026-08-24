import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import "./GlossaryHint.scss";

type GlossaryHintProps = {
  term: string;
  hint: string;
  className?: string;
};

type TooltipCoords = {
  top: number;
  left: number;
  placement: "above" | "below";
};

function computeTooltipCoords(trigger: HTMLButtonElement): TooltipCoords {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const estimatedHeight = 40;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const placement =
    spaceAbove >= estimatedHeight + gap || spaceAbove >= spaceBelow
      ? "above"
      : "below";

  return {
    left: rect.left + rect.width / 2,
    top: placement === "above" ? rect.top - gap : rect.bottom + gap,
    placement,
  };
}

/** Inline «Эскертүү»: small button with Russian meaning of a Kyrgyz term. */
export function GlossaryHint({ term, hint, className }: GlossaryHintProps) {
  const label = `${term} — ${hint}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const updateCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setCoords(computeTooltipCoords(trigger));
  }, []);

  const show = useCallback(() => {
    updateCoords();
    setOpen(true);
  }, [updateCoords]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (prev) return false;
      updateCoords();
      return true;
    });
  }, [updateCoords]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (window.matchMedia("(hover: hover)").matches) return;
      event.preventDefault();
      toggle();
    },
    [toggle],
  );

  useLayoutEffect(() => {
    if (!open) return undefined;

    const onReposition = () => updateCoords();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);

    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updateCoords]);

  const tooltip =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <span
            className={[
              "glossary-hint__tooltip",
              "glossary-hint__tooltip--portal",
              coords.placement === "below"
                ? "glossary-hint__tooltip--below"
                : "glossary-hint__tooltip--above",
            ].join(" ")}
            role="tooltip"
            style={{
              top: coords.top,
              left: coords.left,
            }}
          >
            {hint}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span className={["glossary-hint", className].filter(Boolean).join(" ")}>
        <button
          ref={triggerRef}
          type="button"
          className="glossary-hint__trigger"
          aria-label={label}
          data-term={term}
          data-hint={hint}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          onClick={handleClick}
        >
          <Info size={14} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </span>
      {tooltip}
    </>
  );
}
