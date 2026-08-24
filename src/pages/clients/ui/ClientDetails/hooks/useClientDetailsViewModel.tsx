import { useMemo, type ReactNode } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  EMPTY_CLIENT_KPIS,
  type ClientKpis,
} from "@entities/client";

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
  kpis: ClientKpis;
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
  kpis: kpiTotals = EMPTY_CLIENT_KPIS,
  detailsView,
  sectorName,
  onOpenDetailsView,
}: UseClientDetailsViewModelArgs) {
  const { t } = useTranslation();
  const kindTranslate: Record<string, string> = {
    new: t("crm.clients.details.kindNew"),
  };
  const clientName = client?.fio || client?.full_name || "—";
  const clientTypeLabel = typeLabel(client?.type);
  const statusText = kindTranslate[String(client?.status || "")] || client?.status || "—";
  const isBuildingSector = sectorName === "Строительная компания";

  const totals = useMemo<DealTotals>(
    () => ({
      debt: kpiTotals.debt.amount,
      prepayment: kpiTotals.prepayment.amount,
      sale: kpiTotals.sale.amount,
      amount: kpiTotals.sale.amount,
    }),
    [kpiTotals],
  );

  const dealKindCounts = useMemo(
    () => ({
      debt: kpiTotals.debt.count,
      prepayment: kpiTotals.prepayment.count,
      sale: kpiTotals.sale.count,
    }),
    [kpiTotals],
  );

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
          title: deal.title || t("crm.clients.details.noTitle"),
          date,
          amount,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [deals, detailsView, t]);

  const detailsMeta = useMemo<DetailsMeta>(() => {
    if (detailsView === "debt") {
      return {
        title: isBuildingSector
          ? t("crm.clients.details.contractSum")
          : t("crm.clients.details.debt"),
        subtitle: t("crm.clients.details.operationsList"),
        icon: <TrendingDown />,
        tone: "danger",
        total: isBuildingSector
          ? Number(totals.sale || 0)
          : Number(totals.debt || 0),
      };
    }
    if (detailsView === "prepayment") {
      return {
        title: isBuildingSector
          ? t("crm.clients.details.prepayment")
          : t("crm.clients.details.advance"),
        subtitle: t("crm.clients.details.operationsList"),
        icon: <Wallet />,
        tone: "success",
        total: Number(totals.prepayment || 0),
      };
    }
    return {
      title: isBuildingSector
        ? t("crm.clients.details.debtRemainder")
        : t("crm.clients.details.sale"),
      subtitle: t("crm.clients.details.operationsList"),
      icon: <TrendingUp />,
      tone: "default",
      total: isBuildingSector
        ? Number(totals.debt || 0)
        : Number(totals.sale || 0),
    };
  }, [detailsView, isBuildingSector, totals.debt, totals.prepayment, totals.sale, t]);

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
        label: t("crm.clients.details.deals"),
        value: String(deals.length),
        hint: t("crm.clients.details.dealsHint"),
      },
      {
        label: isBuildingSector
          ? t("crm.clients.details.contract")
          : t("crm.clients.details.debt"),
        value: `${debtValue.toFixed(2)}`,
        unit: t("common.currencySom"),
        hint: isBuildingSector
          ? t("crm.clients.details.contractSum")
          : t("crm.clients.details.debtRemainder"),
      },
      {
        label: t("crm.clients.details.last"),
        value: lastDealDate,
        hint: t("crm.clients.details.lastDealHint"),
      },
    ];
  }, [deals, isBuildingSector, totals.debt, totals.sale, t]);

  const kpis: KpiItem[] = [
    {
      key: "debt",
      modifier: "cdx__kpi--debt",
      icon: <TrendingDown />,
      label: isBuildingSector
        ? t("clients.kpi.contractAmount")
        : t("clients.kpi.debt"),
      value: isBuildingSector ? totals.sale ?? 0 : totals.debt ?? 0,
      count: dealKindCounts.debt,
      onClick: () => onOpenDetailsView("debt"),
    },
    {
      key: "prepayment",
      modifier: "cdx__kpi--prepay",
      icon: <Wallet />,
      label: isBuildingSector
        ? t("clients.kpi.prepaid")
        : t("clients.kpi.prepayment"),
      value: totals.prepayment ?? 0,
      count: dealKindCounts.prepayment,
      onClick: () => onOpenDetailsView("prepayment"),
    },
    {
      key: "sale",
      modifier: "cdx__kpi--sale",
      icon: <TrendingUp />,
      label: isBuildingSector
        ? t("clients.kpi.debtRemaining")
        : t("clients.kpi.sale"),
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
