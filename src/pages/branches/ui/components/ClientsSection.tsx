import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { FaSearch, FaUserFriends } from "react-icons/fa";
import {
  BranchSection,
  SectionState,
  ShowMore,
  initials,
  useShowMore,
} from "./BranchSection";

type ClientsSectionProps = {
  loading: boolean;
  items: Array<{
    id: string | number;
    name?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  }>;
};

export default function ClientsSection({ loading, items }: ClientsSectionProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.name, it.full_name, it.phone, it.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);
  const { visible, rest, more } = useShowMore(filtered);

  return (
    <BranchSection
      title={t("crm.branches.details.clients.title")}
      count={loading ? null : items.length}
      actions={
        items.length > 0 && (
          <label className="bd-search">
            <FaSearch aria-hidden="true" />
            <input
              className="nur-input"
              placeholder={t("crm.branches.details.clients.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )
      }
    >
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaUserFriends />}
        emptyTitle={t("crm.branches.details.clients.emptyTitle")}
        emptyText={t("crm.branches.details.clients.emptyText")}
      >
        {filtered.length === 0 ? (
          <p className="bd-section__hint">
            {t("crm.branches.details.states.nothingFound", { query })}
          </p>
        ) : (
          <ul className="bd-people">
            {visible.map((item) => {
              const name = item.name || item.full_name || t("crm.branches.details.clients.noName");
              return (
                <li key={item.id} className="bd-person">
                  <span className="bd-person__avatar" aria-hidden="true">
                    {initials(name)}
                  </span>
                  <span className="bd-person__info">
                    <b>{name}</b>
                    <span>{item.address || item.email || "—"}</span>
                  </span>
                  {item.phone && (
                    <a className="bd-person__phone" href={`tel:${item.phone}`}>
                      {item.phone}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ShowMore rest={rest} onClick={more} />
      </SectionState>
    </BranchSection>
  );
}
