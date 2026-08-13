import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_CONSULTANT_DRAFT,
  fetchConsultantDefaultPercent,
  fetchSaleConsultants,
  previewCommissionAmount,
  parseCommissionPercent,
  type ConsultantDraft,
  type SaleConsultant,
} from "@entities/sale";

type Args = {
  total: number;
  branchId?: string | number | null;
  consultantDraft?: ConsultantDraft;
  onConsultantDraftChange?: (draft: ConsultantDraft) => void;
};

export function usePaymentConsultant({
  total,
  branchId,
  consultantDraft: consultantDraftProp,
  onConsultantDraftChange,
}: Args) {
  const [localDraft, setLocalDraft] = useState<ConsultantDraft>(
    consultantDraftProp || EMPTY_CONSULTANT_DRAFT,
  );
  const [consultants, setConsultants] = useState<SaleConsultant[]>([]);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  const prefillForIdRef = useRef("");
  const onChangeRef = useRef(onConsultantDraftChange);
  onChangeRef.current = onConsultantDraftChange;

  const draft = consultantDraftProp ?? localDraft;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const setDraft = useCallback(
    (updater: ConsultantDraft | ((prev: ConsultantDraft) => ConsultantDraft)) => {
      const current = draftRef.current;
      const next = typeof updater === "function" ? updater(current) : updater;
      draftRef.current = next;
      onChangeRef.current?.(next);
      if (consultantDraftProp == null) setLocalDraft(next);
    },
    [consultantDraftProp],
  );

  useEffect(() => {
    if (!draft.specify) return undefined;
    let cancelled = false;
    setConsultantsLoading(true);
    fetchSaleConsultants()
      .then((list) => {
        if (!cancelled) setConsultants(list);
      })
      .catch(() => {
        if (!cancelled) setConsultants([]);
      })
      .finally(() => {
        if (!cancelled) setConsultantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.specify]);

  useEffect(() => {
    if (!draft.specify || !draft.consultantId) {
      prefillForIdRef.current = "";
      return undefined;
    }
    if (prefillForIdRef.current === draft.consultantId) return undefined;

    const fromList = consultants.find((item) => item.id === draft.consultantId);
    const listedDefault = fromList?.default_commission_percent;
    if (listedDefault != null && String(listedDefault).trim() !== "") {
      prefillForIdRef.current = draft.consultantId;
      setDraft((prev) => ({
        ...prev,
        percent: String(listedDefault).replace(",", "."),
        commissionEnabled: true,
      }));
      return undefined;
    }

    let cancelled = false;
    fetchConsultantDefaultPercent(draft.consultantId, branchId)
      .then((percent) => {
        if (cancelled) return;
        prefillForIdRef.current = draft.consultantId;
        setDraft((prev) => ({
          ...prev,
          percent: percent,
          commissionEnabled: true,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        prefillForIdRef.current = draft.consultantId;
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, consultants, draft.consultantId, draft.specify, setDraft]);

  const handleSpecifyChange = useCallback(
    (specify: boolean) => {
      setDraft((prev) => ({
        ...prev,
        specify,
        ...(specify ? {} : { commissionEnabled: true }),
      }));
    },
    [setDraft],
  );

  const handleConsultantChange = useCallback(
    (consultantId: string, consultantName: string) => {
      prefillForIdRef.current = "";
      setDraft((prev) => ({
        ...prev,
        consultantId,
        consultantName,
        commissionEnabled: true,
        percent: "",
      }));
    },
    [setDraft],
  );

  const handleCommissionEnabledChange = useCallback(
    (commissionEnabled: boolean) => {
      setDraft((prev) => ({ ...prev, commissionEnabled }));
    },
    [setDraft],
  );

  const handlePercentChange = useCallback(
    (percent: string) => {
      setDraft((prev) => ({ ...prev, percent }));
    },
    [setDraft],
  );

  const previewAmount = useMemo(() => {
    if (!draft.specify || !draft.commissionEnabled) return 0;
    const percent = parseCommissionPercent(draft.percent);
    if (percent == null) return 0;
    return previewCommissionAmount(total, percent);
  }, [draft.commissionEnabled, draft.percent, draft.specify, total]);

  return {
    draft,
    consultants,
    consultantsLoading,
    previewAmount,
    handleSpecifyChange,
    handleConsultantChange,
    handleCommissionEnabledChange,
    handlePercentChange,
  };
}
