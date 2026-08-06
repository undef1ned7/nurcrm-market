import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import { usePageChrome } from "./PageChromeContext";
import "./PageShell.scss";

export function PageShell({ children, className = "" }) {
  return <div className={`nur-page ${className}`.trim()}>{children}</div>;
}

export function Breadcrumbs({ items = [], className = "" }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Хлебные крошки" className={className}>
      <ol className="nur-breadcrumbs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {index > 0 ? (
                <span className="nur-breadcrumbs__sep" aria-hidden="true">
                  /
                </span>
              ) : null}
              {isLast || !item.to ? (
                <span className="nur-breadcrumbs__current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PageHeaderLocal({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = "",
}) {
  return (
    <header className={`nur-page__header ${className}`.trim()}>
      <div className="nur-page__title-block">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        {title ? <h1 className="nur-page__title">{title}</h1> : null}
        {subtitle ? <p className="nur-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="nur-page__actions">{actions}</div> : null}
    </header>
  );
}

/**
 * Publishes title/subtitle/actions into the layout Header when available.
 * On fullscreen routes (no global Header) renders the in-page header.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = "",
}) {
  const { active, setMeta, setActions } = usePageChrome();

  useLayoutEffect(() => {
    if (!active) return undefined;
    setMeta({
      ...(title != null && title !== "" ? { title } : {}),
      ...(subtitle != null && subtitle !== "" ? { subtitle } : {}),
    });
    return () => setMeta(null);
  }, [active, title, subtitle, setMeta]);

  useLayoutEffect(() => {
    if (!active) {
      setActions(null);
      return undefined;
    }
    setActions(
      actions ? (
        <div className={`header__page-actions ${className}`.trim()}>
          {actions}
        </div>
      ) : null,
    );
  }, [active, actions, className, setActions]);

  useLayoutEffect(() => {
    return () => setActions(null);
  }, [setActions]);

  if (!active) {
    return (
      <PageHeaderLocal
        title={title}
        subtitle={subtitle}
        actions={actions}
        breadcrumbs={breadcrumbs}
        className={className}
      />
    );
  }

  // Title/actions are rendered by the layout Header via PageChrome context.
  return null;
}

export function FilterBar({ children, className = "" }) {
  return (
    <div className={`nur-page__toolbar ${className}`.trim()}>{children}</div>
  );
}

export function PagePanel({
  children,
  className = "",
  bodyClassName = "",
  flush = false,
  title,
  description,
  actions,
}) {
  const bodyCls = [
    "nur-page__panel-body",
    flush ? "nur-page__panel-body--flush" : "",
    bodyClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const hasChrome = title || description || actions;

  return (
    <section className={`nur-page__panel ${className}`.trim()}>
      {hasChrome ? (
        <div className="nur-page__panel-head">
          <div className="nur-page__panel-head-text">
            {title ? <h2 className="nur-page__panel-title">{title}</h2> : null}
            {description ? (
              <p className="nur-page__panel-desc">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="nur-page__panel-actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={bodyCls}>{children}</div>
    </section>
  );
}

export function StatGrid({ children, className = "" }) {
  return (
    <div className={`nur-page__stats ${className}`.trim()}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  className = "",
  animate = false,
  format,
}) {
  const showAnimated =
    animate && typeof value === "number" && Number.isFinite(value);

  return (
    <div className={`nur-stat ${className}`.trim()}>
      {label ? <p className="nur-stat__label">{label}</p> : null}
      {value != null ? (
        <p className="nur-stat__value">
          {showAnimated ? (
            <AnimatedNumber value={value} format={format} />
          ) : (
            value
          )}
        </p>
      ) : null}
      {hint ? <p className="nur-stat__hint">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ icon, title, text, action, className = "" }) {
  return (
    <div className={`nur-empty ${className}`.trim()} role="status">
      {icon ? <div className="nur-empty__icon">{icon}</div> : null}
      {title ? <h3 className="nur-empty__title">{title}</h3> : null}
      {text ? <p className="nur-empty__text">{text}</p> : null}
      {action ? <div className="nur-empty__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Не удалось загрузить данные",
  text = "Проверьте подключение и попробуйте снова.",
  action,
  className = "",
}) {
  return (
    <div className={`nur-empty nur-empty--error ${className}`.trim()} role="alert">
      <div className="nur-empty__icon nur-empty__icon--error" aria-hidden="true">
        !
      </div>
      <h3 className="nur-empty__title">{title}</h3>
      {text ? <p className="nur-empty__text">{text}</p> : null}
      {action ? <div className="nur-empty__action">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ rows = 4, className = "" }) {
  return (
    <div
      className={`nur-loading-state nur-loader-delay ${className}`.trim()}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="nur-skeleton nur-skeleton--title" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`nur-skeleton nur-skeleton--text nur-loading-state__row`}
        />
      ))}
    </div>
  );
}

export function StatusChip({ children, tone = "default", className = "" }) {
  const toneClass = tone !== "default" ? `nur-chip--${tone}` : "";
  return (
    <span className={`nur-chip ${toneClass} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function SectionTabs({ items = [], value, onChange, className = "" }) {
  return (
    <div className={`nur-tabs ${className}`.trim()} role="tablist">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`nur-tabs__tab${selected ? " is-active" : ""}`}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default PageShell;
