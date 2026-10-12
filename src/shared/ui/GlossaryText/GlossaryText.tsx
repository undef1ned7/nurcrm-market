import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@shared/config/locale";
import { splitGlossaryText } from "@shared/lib/i18n/glossaryText";
import { GlossaryHint } from "@shared/ui/GlossaryHint/GlossaryHint";

type GlossaryTextProps = {
  children: string;
  className?: string;
  /** Force hints on/off regardless of language. */
  enabled?: boolean;
};

/**
 * Renders translated copy and, for Kyrgyz, adds «Эскертүү» hint buttons
 * next to glossary terms.
 */
export function GlossaryText({
  children,
  className,
  enabled,
}: GlossaryTextProps) {
  const { i18n } = useTranslation();
  const showHints =
    enabled ?? normalizeLanguage(i18n.resolvedLanguage || i18n.language) === "ky";

  const parts = useMemo(
    () => (showHints ? splitGlossaryText(children) : [{ type: "text" as const, value: children }]),
    [children, showHints],
  );

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.type === "text" ? (
          <span key={`t-${index}`}>{part.value}</span>
        ) : (
          <span key={`g-${index}`} className="glossary-text__term">
            {part.value}
            <GlossaryHint term={part.value} hint={part.hint} />
          </span>
        ),
      )}
    </span>
  );
}
