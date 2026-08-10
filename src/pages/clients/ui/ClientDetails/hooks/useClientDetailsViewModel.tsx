import { useMemo, type ReactNode } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { toIsoDate10, typeLabel } from "../clientDetails.helpers";
import type {
  ClientRecord,
  DealRecord,
  DealTotals,
  DetailRow,
  DetailsView,
} from "../clientDetails.types";

type UseClientDetailsViewModelArgs = {
  client: ClientRecord | null;
  deals: DealRecord[];
  detailsView: DetailsView;
  sectorName?: string;
  onOpenDetailsView: (view: Exclude<DetailsView, null>) => void;
};

export type ProfileSnapshotItem = {
  label: string;
  value: string;
  unit?: string;
  hint: string;
};

export type KpiItem = {
  key: string;
  modifier: string;
  icon: ReactNode;
  label: string;
  value: number;
  count: number;
  onClick: () => void;
};

export type RequisiteItem = {
  label: string;
  value?: string;
  full?: boolean;
};

export type DetailsMeta = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: string;
  total: number;
};

export function useClientDetailsViewModel({
  client,
  deals,
  detailsView,
  sectorName,
  onOpenDetailsView,
}: UseClientDetailsViewModelArgs) {
  const kindTranslate: Record<string, string> = { new: "Новый" };
  const clientName = client?.fio || client?.full_name || "—";
  const clientTypeLabel = typeLabel(client?.type);
  const statusText = kindTranslate[String(client?.status || "")] || client?.status || "—";
  const isBuildingSector = sectorName === "Строительная компания";

  const totals = useMemo<DealTotals>(() => {
    const agg = { debt: 0, prepayment: 0, sale: 0 };
    for (const d of deals) {
      const kind = d.kind || "sale";
      if (kind === "debt") {
        agg.debt += Number(d.remaining_debt || 0);
        agg.prepayment += Number(d.prepayment || 0);
      } else if (kind === "prepayment") {
        agg.prepayment += Number(d.amount || 0);
      } else {
        agg.sale += Number(d.amount || 0);
      }
    }
    return { ...agg, amount: agg.sale };
  }, [deals]);

  const detailRows = useMemo<DetailRow[]>(() => {
    if (!detailsView) return [];

    const resolveType = (deal: DealRecord) => {
      if (detailsView === "debt") return deal.kind === "debt";
      if (detailsView === "prepayment") {
        return deal.kind === "prepayment" || Number(deal.prepayment || 0) > 0;
      }
      return deal.kind === "sale";
    };

    return deals
      .filter(resolveType)
      .map((deal) => {
        const date =
          toIsoDate10(deal.date || deal.created_at || deal.updated_at) || "—";
        let amount = Number(deal.amount || 0);

        if (detailsView === "debt") amount = Number(deal.remaining_debt || 0);
        if (detailsView === "prepayment") {
          amount =
            deal.kind === "prepayment"
              ? Number(deal.amount || 0)
              : Number(deal.prepayment || 0);
        }

        return {
          id: deal.id,
          title: deal.title || "Без названия",
          date,
          amount,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [deals, detailsView]);

  const detailsMeta = useMemo<DetailsMeta>(() => {
    if (detailsView === "debt") {
      return {
        title: isBuildingSector ? "Сумма договора" : "Долг",
        subtitle: "Список операций по выбранной категории",
        icon: <TrendingDown />,
        tone: "danger",
        total: isBuildingSector
          ? Number(totals.sale || 0)
          : Number(totals.debt || 0),
      };
    }
    if (detailsView === "prepayment") {
      return {
        title: isBuildingSector ? "Предоплата" : "Аванс",
        subtitle: "Список операций по выбранной категории",
        icon: <Wallet />,
        tone: "success",
        total: Number(totals.prepayment || 0),
      };
    }
    return {
      title: isBuildingSector ? "Остаток долга" : "Продажа",
      subtitle: "Список операций по выбранной категории",
      icon: <TrendingUp />,
      tone: "default",
      total: isBuildingSector
        ? Number(totals.debt || 0)
        : Number(totals.sale || 0),
    };
  }, [detailsView, isBuildingSector, totals.debt, totals.prepayment, totals.sale]);

  const dealKindCounts = useMemo(() => {
    const acc = { debt: 0, prepayment: 0, sale: 0 };
    for (const d of deals) {
      const kind = d.kind || "sale";
      if (kind === "debt") acc.debt += 1;
      else if (kind === "prepayment") acc.prepayment += 1;
      else acc.sale += 1;
    }
    return acc;
  }, [deals]);

  const clientInitials = useMemo(() => {
    const parts = String(clientName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "—";
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [clientName]);

  const profileSnapshot = useMemo<ProfileSnapshotItem[]>(() => {
    const lastDealDate =
      deals
        .map((d) => toIsoDate10(d.date || d.created_at || d.updated_at))
        .filter(Boolean)
        .sort()
        .at(-1) || "—";

    const debtValue = isBuildingSector
      ? Number(totals.sale || 0)
      : Number(totals.debt || 0);

    return [
      {
        label: "Сделок",
        value: String(deals.length),
        hint: "Всего операций",
      },
      {
        label: isBuildingSector ? "Договор" : "Долг",
        value: `${debtValue.toFixed(2)}`,
        unit: "сом",
        hint: isBuildingSector ? "Сумма договора" : "Остаток долга",
      },
      {
        label: "Последняя",
        value: lastDealDate,
        hint: "Дата последней операции",
      },
    ];
  }, [deals, isBuildingSector, totals.debt, totals.sale]);

  const kpis: KpiItem[] = [
    {
      key: "debt",
      modifier: "cdx__kpi--debt",
      icon: <TrendingDown />,
      label: isBuildingSector ? "Сумма договора" : "Общий долг",
      value: isBuildingSector ? totals.sale ?? 0 : totals.debt ?? 0,
      count: dealKindCounts.debt,
      onClick: () => onOpenDetailsView("debt"),
    },
    {
      key: "prepayment",
      modifier: "cdx__kpi--prepay",
      icon: <Wallet />,
      label: isBuildingSector ? "Предоплата" : "Аванс",
      value: totals.prepayment ?? 0,
      count: dealKindCounts.prepayment,
      onClick: () => onOpenDetailsView("prepayment"),
    },
    {
      key: "sale",
      modifier: "cdx__kpi--sale",
      icon: <TrendingUp />,
      label: isBuildingSector ? "Остаток долга" : "Продажи",
      value: isBuildingSector ? totals.debt ?? 0 : totals.sale ?? 0,
      count: dealKindCounts.sale,
      onClick: () => onOpenDetailsView("sale"),
    },
  ];

  const requisites: RequisiteItem[] = [
    { label: "ОсОО", value: client?.llc },
    { label: "ИНН", value: client?.inn },
    { label: "ОКПО", value: client?.okpo },
    { label: "Счет", value: client?.score },
    { label: "БИК", value: client?.bik },
    { label: "Адрес", value: client?.address, full: true },
  ];

  const showSupplierSections =
    String(client?.type || "").toLowerCase() === "suppliers" &&
    ["Магазин", "Производство"].includes(String(sectorName || ""));

  return {
    clientName,
    clientTypeLabel,
    statusText,
    isBuildingSector,
    totals,
    detailRows,
    detailsMeta,
    dealKindCounts,
    clientInitials,
    profileSnapshot,
    kpis,
    requisites,
    showSupplierSections,
  };
}
