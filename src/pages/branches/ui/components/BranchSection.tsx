import { useTranslation } from "react-i18next";
import { useEffect, useState, type ReactNode } from "react";
import { EmptyState, LoadingState } from "@shared/ui/page-shell";

/** Единый каркас вкладки карточки филиала: заголовок, счётчик, действия. */
export function BranchSection({
  title,
  count,
  actions,
  children,
}: {
  title: string;
  count?: number | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bd-section">
      <header className="bd-section__head">
        <h2 className="bd-section__title">
          {title}
          {count != null && <span className="bd-section__count">{count}</span>}
        </h2>
        {actions ? <div className="bd-section__actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function SectionState({
  loading,
  empty,
  icon,
  emptyTitle,
  emptyText,
  children,
}: {
  loading?: boolean;
  empty: boolean;
  icon?: ReactNode;
  emptyTitle: string;
  emptyText?: string;
  children: ReactNode;
}) {
  if (loading) return <LoadingState rows={5} />;
  if (empty) return <EmptyState icon={icon} title={emptyTitle} text={emptyText} />;
  return <>{children}</>;
}

/** Длинные списки рисуем порциями, чтобы вкладка не тормозила на тысячах строк. */
export function useShowMore<T>(items: T[], step = 50) {
  const [limit, setLimit] = useState(step);
  useEffect(() => setLimit(step), [items, step]);
  return {
    visible: items.slice(0, limit),
    rest: Math.max(0, items.length - limit),
    more: () => setLimit((l) => l + step),
  };
}

export function ShowMore({ rest, onClick }: { rest: number; onClick: () => void }) {
  const { t } = useTranslation();
  if (rest <= 0) return null;
  return (
    <div className="bd-section__more">
      <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={onClick}>
        {t("crm.branches.details.states.showMore", { rest })}
      </button>
    </div>
  );
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const money = (v: unknown) =>
  num(v).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const qty = (v: unknown) =>
  num(v).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

export const dateTime = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
