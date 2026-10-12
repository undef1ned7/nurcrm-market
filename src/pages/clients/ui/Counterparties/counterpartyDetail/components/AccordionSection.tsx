export function AccordionSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}) {
  return (
    <details className="counterparty-detail-page__accordion" open={defaultOpen}>
      <summary className="counterparty-detail-page__accordion-summary">
        <div className="counterparty-detail-page__accordion-summary-main">
          <span className="counterparty-detail-page__accordion-title">
            {title}
          </span>
          {subtitle ? (
            <span className="counterparty-detail-page__accordion-subtitle">
              {subtitle}
            </span>
          ) : null}
        </div>
      </summary>
      <div className="counterparty-detail-page__accordion-body">{children}</div>
    </details>
  );
}
