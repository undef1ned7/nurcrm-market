import "./KnowledgeBase.scss";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Info,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { PageShell, PageHeader, EmptyState } from "@shared/ui/page-shell";
import {
  KB_ALL_ARTICLES,
  KB_SECTIONS,
  matchesKbQuery,
  type KbArticleContent,
  type KbBlock,
  type KbSectionId,
} from "../model/articles";

const SECTION_ICONS: Record<KbSectionId, typeof BookOpen> = {
  owner: LayoutDashboard,
  reports: BarChart3,
  settings: Settings,
  faq: HelpCircle,
};

/** Популярные статьи на главной и подсказки под поиском. */
const POPULAR = ["summary", "calc-price", "calc-check", "abc-what", "log-entries", "faq"];

/** Куда ведёт кнопка «Открыть раздел» под статьёй. */
const ARTICLE_LINKS: Record<string, string> = {
  summary: "/crm/market/summary",
  "summary-blocks": "/crm/market/summary",
  "summary-refresh": "/crm/market/summary",
  "calc-overview": "/crm/market/calculator",
  "calc-price": "/crm/market/calculator",
  "calc-batch": "/crm/market/calculator",
  "calc-check": "/crm/market/calculator",
  "calc-breakeven": "/crm/market/calculator",
  "calc-discount": "/crm/market/calculator",
  "abc-what": "/crm/market/abc",
  "abc-slices": "/crm/market/abc",
  "abc-howto": "/crm/market/abc",
  "abc-source": "/crm/market/abc",
  "log-overview": "/crm/market/error-log",
  "log-entries": "/crm/market/error-log",
  "log-buttons": "/crm/market/error-log",
  "log-storage": "/crm/market/error-log",
};

const headingId = (slug: string, i: number) => `kb-${slug}-${i}`;

function Block({ block, id }: { block: KbBlock; id?: string }) {
  const { t } = useTranslation();
  switch (block.type) {
    case "h":
      return <h3 id={id}>{block.text}</h3>;
    case "p":
      return <p>{block.text}</p>;
    case "steps":
      return (
        <ol className="kb__steps">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "important":
      return (
        <div className="kb__important" role="note">
          <Info size={18} aria-hidden />
          <div>
            <strong>{t("crm.tools.kb.important")}</strong>
            {block.text}
          </div>
        </div>
      );
    case "formula":
      return <div className="kb__formula">{block.text}</div>;
    case "table":
      return (
        <div className="kb__table-wrap">
          <table className="kb__table">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

/** Первая фраза статьи — для карточек и результатов поиска. */
const lead = (c: KbArticleContent) => {
  const first = c.blocks.find((b) => b.type === "p") as { text: string } | undefined;
  const text = first?.text ?? "";
  return text.length > 130 ? `${text.slice(0, 130)}…` : text;
};

/**
 * База знаний: главная с разделами и поиском, читалка со статьёй, оглавлением и переходами.
 * Открытая статья хранится в адресе (`?a=`), поэтому смена языка её не сбрасывает.
 */
export default function KnowledgeBase() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<KbSectionId>>(new Set());

  const slugParam = params.get("a");
  const current = KB_ALL_ARTICLES.find((a) => a.slug === slugParam) ?? null;

  const contents = useMemo(() => {
    const map = new Map<string, KbArticleContent>();
    KB_ALL_ARTICLES.forEach((a) => {
      const data = t(`crm.tools.kb.articles.${a.slug}`, { returnObjects: true }) as any;
      map.set(a.slug, {
        title: data?.title ?? a.slug,
        keywords: data?.keywords ?? "",
        blocks: Array.isArray(data?.blocks) ? data.blocks : [],
      });
    });
    return map;
  }, [t]);

  const suggestions = (t("crm.tools.kb.suggest", { returnObjects: true }) as unknown as string[]) || [];
  const searching = query.trim().length > 0;
  const results = searching
    ? KB_ALL_ARTICLES.filter((a) => matchesKbQuery(contents.get(a.slug)!, query))
    : [];

  const open = (slug: string) => {
    setQuery("");
    setParams({ a: slug });
    window.scrollTo?.({ top: 0 });
  };
  const home = () => {
    setQuery("");
    setParams({});
  };
  const toggle = (id: KbSectionId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sectionName = (id: KbSectionId) => t(`crm.tools.kb.sections.${id}`);
  const article = current ? contents.get(current.slug)! : null;
  const index = current ? KB_ALL_ARTICLES.findIndex((a) => a.slug === current.slug) : -1;
  const prev = index > 0 ? KB_ALL_ARTICLES[index - 1] : null;
  const next = index >= 0 && index < KB_ALL_ARTICLES.length - 1 ? KB_ALL_ARTICLES[index + 1] : null;
  const toc = article
    ? article.blocks.flatMap((b, i) => (b.type === "h" ? [{ id: headingId(current!.slug, i), text: b.text }] : []))
    : [];
  const compactHero = !!current && !searching;

  const searchBox = (
    <div className="kb__searchbox">
      <Search size={18} aria-hidden />
      <input
        type="search"
        value={query}
        placeholder={t("crm.tools.kb.searchPlaceholder")}
        aria-label={t("crm.tools.kb.searchLabel")}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button type="button" className="kb__clear" aria-label={t("common.reset")} onClick={() => setQuery("")}>
          ×
        </button>
      )}
    </div>
  );

  return (
    <PageShell className="kb">
      <PageHeader title={t("crm.tools.kb.pageTitle")} subtitle={t("crm.tools.kb.pageSubtitle")} />

      <div className={`kb__hero${compactHero ? " kb__hero--compact" : ""}`}>
        {!compactHero && (
          <div>
            <h2 className="kb__hero-title">{t("crm.tools.kb.heroTitle")}</h2>
            <p className="kb__hero-text">{t("crm.tools.kb.heroText")}</p>
          </div>
        )}
        {searchBox}
        {!compactHero && (
          <div className="kb__suggest">
            <span>{t("crm.tools.kb.tryAsking")}</span>
            {suggestions.map((q) => (
              <button key={q} type="button" className="kb__suggest-btn" onClick={() => setQuery(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {searching ? (
        <section aria-live="polite">
          <h2 className="kb__h2">{t("crm.tools.kb.resultsCount", { count: results.length })}</h2>
          {results.length === 0 ? (
            <EmptyState title={t("crm.tools.kb.nothingFound")} text={t("crm.tools.kb.nothingFoundText")} />
          ) : (
            <div className="kb__results" style={{ marginTop: 12 }}>
              {results.map((a) => {
                const c = contents.get(a.slug)!;
                return (
                  <button key={a.slug} type="button" className="kb__result" onClick={() => open(a.slug)}>
                    <em>{sectionName(a.section)}</em>
                    <strong>{c.title}</strong>
                    <span>{lead(c)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : !current || !article ? (
        <>
          <h2 className="kb__h2">{t("crm.tools.kb.popular")}</h2>
          <div className="kb__popular">
            {POPULAR.map((slug) => {
              const c = contents.get(slug)!;
              return (
                <button key={slug} type="button" className="kb__card" onClick={() => open(slug)}>
                  <strong>{c.title}</strong>
                  <span>{lead(c)}</span>
                </button>
              );
            })}
          </div>

          <h2 className="kb__h2">{t("crm.tools.kb.sectionsTitle")}</h2>
          <div className="kb__sections">
            {KB_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              return (
                <section key={section.id} className="kb__section">
                  <div className="kb__section-head">
                    <span className="kb__icon"><Icon size={22} /></span>
                    <div>
                      <h3 className="kb__section-title">{sectionName(section.id)}</h3>
                      <p className="kb__section-desc">{t(`crm.tools.kb.sectionDesc.${section.id}`)}</p>
                    </div>
                  </div>
                  <ul className="kb__section-list">
                    {section.articles.map((slug) => (
                      <li key={slug}>
                        <button type="button" className="kb__row" onClick={() => open(slug)}>
                          <span>{contents.get(slug)!.title}</span>
                          <ChevronRight size={16} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <span className="kb__section-count">
                    {t("crm.tools.kb.articlesCount", { count: section.articles.length })}
                  </span>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <div className="kb__reader">
          <nav className="kb__nav" aria-label={t("crm.tools.kb.pageTitle")}>
            {KB_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              const isCollapsed = collapsed.has(section.id);
              return (
                <div key={section.id} className="kb__nav-group">
                  <button type="button" className="kb__nav-title" aria-expanded={!isCollapsed} onClick={() => toggle(section.id)}>
                    <Icon size={16} aria-hidden />
                    {sectionName(section.id)}
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {!isCollapsed &&
                    section.articles.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        className={`kb__nav-link${slug === current.slug ? " is-active" : ""}`}
                        aria-current={slug === current.slug ? "page" : undefined}
                        onClick={() => open(slug)}
                      >
                        {contents.get(slug)!.title}
                      </button>
                    ))}
                </div>
              );
            })}
          </nav>

          <article className="kb__article">
            <p className="kb__crumbs">
              <button type="button" onClick={home}>{t("crm.tools.kb.pageTitle")}</button>
              <ChevronRight size={14} aria-hidden />
              <span>{sectionName(current.section)}</span>
            </p>
            <h2 className="kb__title">{article.title}</h2>
            {article.blocks.length === 0 ? (
              <EmptyState title={t("crm.tools.kb.emptyArticle")} />
            ) : (
              <div className="kb__body">
                {article.blocks.map((b, i) => (
                  <Block key={i} block={b} id={b.type === "h" ? headingId(current.slug, i) : undefined} />
                ))}
              </div>
            )}

            <div className="kb__actions">
              {ARTICLE_LINKS[current.slug] && (
                <Link className="nur-btn nur-btn--primary" to={ARTICLE_LINKS[current.slug]}>
                  {t("crm.tools.kb.openSection")}
                </Link>
              )}
              <button type="button" className="nur-btn nur-btn--secondary" onClick={home}>
                {t("crm.tools.kb.allSections")}
              </button>
            </div>

            <div className="kb__pager">
              {prev ? (
                <button type="button" className="kb__pager-btn" onClick={() => open(prev.slug)}>
                  <small><ArrowLeft size={12} /> {t("crm.tools.kb.prev")}</small>
                  <strong>{contents.get(prev.slug)!.title}</strong>
                </button>
              ) : <span />}
              {next && (
                <button type="button" className="kb__pager-btn kb__pager-btn--next" onClick={() => open(next.slug)}>
                  <small>{t("crm.tools.kb.next")} <ArrowRight size={12} /></small>
                  <strong>{contents.get(next.slug)!.title}</strong>
                </button>
              )}
            </div>
          </article>

          {toc.length > 1 && (
            <aside className="kb__toc" aria-label={t("crm.tools.kb.onThisPage")}>
              <p className="kb__toc-title">{t("crm.tools.kb.onThisPage")}</p>
              <ul className="kb__toc-list">
                {toc.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="kb__toc-link"
                      onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}
    </PageShell>
  );
}
