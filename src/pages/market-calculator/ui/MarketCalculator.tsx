import "./calc.scss";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Layers, ListChecks, Percent, Target } from "lucide-react";
import { PageShell, PageHeader } from "@shared/ui/page-shell";
import { NoAccess } from "@shared/ui/tools-kit";
import { useToolsAccess } from "@entities/user";
import { PriceTab } from "./PriceTab";
import { BatchTab } from "./BatchTab";
import { CheckTab } from "./CheckTab";
import { BreakevenTab } from "./BreakevenTab";
import { DiscountTab } from "./DiscountTab";

type Tab = "price" | "batch" | "check" | "breakeven" | "discount";
const TABS: Tab[] = ["price", "batch", "check", "breakeven", "discount"];
const STORAGE_KEY = "market_calc_tab";
const TAB_ICONS = {
  price: Calculator,
  batch: Layers,
  check: ListChecks,
  breakeven: Target,
  discount: Percent,
} as const;

const initialTab = (): Tab => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
    if (saved && TABS.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "price";
};

/** Калькуляция: помощник для расчётов цены и прибыли. Только считает — на сервер ничего не записывает. */
export default function MarketCalculator() {
  const { t } = useTranslation();
  const { canViewAnalytics } = useToolsAccess();
  const [tab, setTab] = useState<Tab>(initialTab);
  // Открытые вкладки остаются в памяти (скрытыми) — введённое не теряется при переключении.
  // Монтируем при первом открытии: «Проверка цен» не грузит каталог, пока её не открыли.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([initialTab()]));

  const changeTab = (next: Tab) => {
    setTab(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  if (!canViewAnalytics) {
    return (
      <PageShell>
        <PageHeader title={t("crm.tools.calc.pageTitle")} />
        <NoAccess title={t("crm.tools.noAccess.title")} text={t("crm.tools.noAccess.analytics")} />
      </PageShell>
    );
  }

  return (
    <PageShell className="calc">
      <PageHeader
        title={t("crm.tools.calc.pageTitle")}
        subtitle={t("crm.tools.calc.pageSubtitle")}
      />
      <div className="calc__tabs" role="tablist" aria-label={t("crm.tools.calc.pageTitle")}>
        {TABS.map((v) => {
          const Icon = TAB_ICONS[v];
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={tab === v}
              className={`calc__tab${tab === v ? " is-active" : ""}`}
              onClick={() => changeTab(v)}
            >
              <span className="calc__tab-icon"><Icon size={18} /></span>
              <span className="calc__tab-title">{t(`crm.tools.calc.tabs.${v}`)}</span>
              <span className="calc__tab-text">{t(`crm.tools.calc.tabHints.${v}`)}</span>
            </button>
          );
        })}
      </div>
      {TABS.filter((v) => visited.has(v)).map((v) => (
        <div key={v} role="tabpanel" hidden={tab !== v} aria-label={t(`crm.tools.calc.tabs.${v}`)}>
          {v === "price" && <PriceTab />}
          {v === "batch" && <BatchTab />}
          {v === "check" && <CheckTab active={tab === "check"} />}
          {v === "breakeven" && <BreakevenTab />}
          {v === "discount" && <DiscountTab />}
        </div>
      ))}
    </PageShell>
  );
}
