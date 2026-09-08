import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import BarberMastersPortal from "./BarberMastersPortal";

const listFrom = (data: any) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const PAY_SCHEME_VALUES = ["salary", "percent", "salary_plus_percent"] as const;
const PAY_SCHEME_KEY: Record<string, string> = {
  salary: "schemeSalary",
  percent: "schemePercent",
  salary_plus_percent: "schemeSalaryPlusPercent",
};

const parseNum = (v: any) => {
  const n = Number(String(v || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

async function fetchProfilesForUser(userId) {
  let url = `/main/market-sale-employee-pay-profiles/?user=${encodeURIComponent(userId)}`;
  const acc: any[] = [];
  let guard = 0;
  while (url && guard < 40) {
     
    const { data } = await api.get(url);
    acc.push(...listFrom(data));
    url = data?.next || null;
    guard += 1;
  }
  if (acc.length) return acc;
  url = "/main/market-sale-employee-pay-profiles/";
  guard = 0;
  while (url && guard < 40) {
     
    const { data } = await api.get(url);
    const chunk = listFrom(data);
    acc.push(
      ...chunk.filter((p: any) => String(p?.user ?? p?.user_id ?? "") === String(userId)),
    );
    url = data?.next || null;
    guard += 1;
  }
  return acc;
}

const branchLabel = (p: any, commonAllBranches: string) => {
  if (p?.branch == null && p?.branch_name == null) return commonAllBranches;
  return p?.branch_name || p?.branch?.name || String(p.branch || "—");
};

const MarketSaleEmployeePayProfileModal = ({
  open,
  employee,
  onClose,
  employeeDisplayName,
}: any) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.employees.payProfile.${k}`) as string;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<any>(null);
  const [payScheme, setPayScheme] = useState("salary_plus_percent");
  const [monthlyBaseSalary, setMonthlyBaseSalary] = useState("");
  const [salesPercent, setSalesPercent] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const applyProfile = useCallback((p: any) => {
    if (!p) {
      setSelectedId(null);
      setPayScheme("salary_plus_percent");
      setMonthlyBaseSalary("");
      setSalesPercent("");
      return;
    }
    setSelectedId(p.id);
    setPayScheme(String(p.pay_scheme || "salary_plus_percent"));
    setMonthlyBaseSalary(
      p.monthly_base_salary != null && p.monthly_base_salary !== ""
        ? String(p.monthly_base_salary).replace(",", ".")
        : "",
    );
    setSalesPercent(
      p.sales_percent != null && p.sales_percent !== ""
        ? String(p.sales_percent).replace(",", ".")
        : "",
    );
  }, []);

  const load = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    setError("");
    setDeleteConfirm(false);
    try {
      const list = await fetchProfilesForUser(employee.id);
      setProfiles(list);
      if (list.length) applyProfile(list[0]);
      else applyProfile(null);
    } catch (e: any) {
      setError(
        validateResErrors(e, t("crm.employees.payProfile.errLoadSalary")),
      );
      setProfiles([]);
      applyProfile(null);
    } finally {
      setLoading(false);
    }
  }, [employee?.id, applyProfile, t]);

  useEffect(() => {
    if (open && employee?.id) load();
  }, [open, employee?.id, load]);

  useEffect(() => {
    if (!open) {
      setProfiles([]);
      setSelectedId(null);
      setPayScheme("salary_plus_percent");
      setMonthlyBaseSalary("");
      setSalesPercent("");
      setError("");
      setDeleteConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: any) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onSelectProfile = (e: any) => {
    const id = e.target.value;
    const p = profiles.find((x: any) => String(x.id) === String(id));
    applyProfile(p || null);
    setDeleteConfirm(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!employee?.id) return;
    setSaving(true);
    setError("");
    try {
      const monthlyRaw = monthlyBaseSalary.trim().replace(",", ".");
      const percentRaw = salesPercent.trim().replace(",", ".");
      const monthlyNum = parseNum(monthlyRaw);
      const percentNum = parseNum(percentRaw);

      if (payScheme === "salary" && monthlyNum <= 0) {
        setError(tp("errSchemeSalary"));
        setSaving(false);
        return;
      }
      if (payScheme === "percent" && percentNum <= 0) {
        setError(tp("errSchemePercent"));
        setSaving(false);
        return;
      }
      if (payScheme === "salary_plus_percent" && (monthlyNum <= 0 || percentNum <= 0)) {
        setError(tp("errSchemeBoth"));
        setSaving(false);
        return;
      }
      if (percentNum > 100) {
        setError(tp("errPercentMax"));
        setSaving(false);
        return;
      }

      const monthly =
        payScheme === "percent" ? "0" : String(monthlyNum);
      const percent =
        payScheme === "salary" ? "0" : String(percentNum);

      const payload = {
        user: String(employee.id),
        pay_scheme: payScheme,
        monthly_base_salary: monthly,
        sales_percent: percent,
      };
      if (selectedId) {
        await api.patch(`/main/market-sale-employee-pay-profiles/${selectedId}/`, payload);
      } else {
        await api.post("/main/market-sale-employee-pay-profiles/", payload);
      }
      await load();
    } catch (err: any) {
      setError(validateResErrors(err, tp("errSaveSalary")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/main/market-sale-employee-pay-profiles/${selectedId}/`);
      setDeleteConfirm(false);
      await load();
    } catch (err: any) {
      setError(validateResErrors(err, tp("errDeleteProfile")));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !employee) return null;

  const salaryOnly = payScheme === "salary";
  const percentOnly = payScheme === "percent";

  return (
    <BarberMastersPortal wrapperId="barbermasters-marketsaleemployeepayprofilemodal">
    <div className="barbermasters__overlay" role="presentation" onClick={onClose}>
      <div
        className="barbermasters__modal barbermasters__modal--cafeWaiterPay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-employee-pay-title"
        onClick={(e: any) => e.stopPropagation()}
      >
        <header className="barbermasters__modalHeader">
          <h3 id="market-employee-pay-title" className="barbermasters__modalTitle">
            {tp("marketTitle")}
          </h3>
          <button
            type="button"
            className="barbermasters__iconBtn"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </header>

        <form className="barbermasters__form" onSubmit={handleSubmit}>
          <div className="barbermasters__content">
            <div className="barbermasters__field barbermasters__field--full">
              <div className="barbermasters__employeeCard">
                <div className="barbermasters__employeeInfo">
                  <div className="barbermasters__employeeName">
                    {employeeDisplayName ||
                      t("crm.employees.accessModal.employeeFallback")}
                  </div>
                  <div className="barbermasters__employeeMeta">
                    {employee.email || employee.id}
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="barbermasters__help">{t("common.loading")}</div>
            ) : null}

            {profiles.length > 1 ? (
              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">{tp("profile")}</label>
                <select
                  className="barbermasters__input"
                  value={selectedId || ""}
                  onChange={onSelectProfile}
                  disabled={saving}
                >
                  {profiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {branchLabel(p, tp("commonAllBranches"))}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="barbermasters__field barbermasters__field--full">
              <label className="barbermasters__label">
                {tp("scheme")} <span className="barbermasters__req">*</span>
              </label>
              <select
                className="barbermasters__input"
                value={payScheme}
                onChange={(e: any) => setPayScheme(e.target.value)}
                disabled={saving || loading}
              >
                {PAY_SCHEME_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {tp(PAY_SCHEME_KEY[v])}
                  </option>
                ))}
              </select>
            </div>

            {!percentOnly ? (
              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">
                  {tp("monthlyBase")}{" "}
                  <span className="barbermasters__req">*</span>
                </label>
                <input
                  className="barbermasters__input"
                  type="text"
                  inputMode="decimal"
                  value={monthlyBaseSalary}
                  onChange={(e: any) => setMonthlyBaseSalary(e.target.value)}
                  placeholder="0"
                  disabled={saving || loading}
                />
              </div>
            ) : null}

            {!salaryOnly ? (
              <div className="barbermasters__field barbermasters__field--full">
                <label className="barbermasters__label">
                  {tp("personalSalesPercent")}{" "}
                  <span className="barbermasters__req">*</span>
                </label>
                <input
                  className="barbermasters__input"
                  type="text"
                  inputMode="decimal"
                  value={salesPercent}
                  onChange={(e: any) => setSalesPercent(e.target.value)}
                  placeholder="0"
                  disabled={saving || loading}
                />
                <div className="barbermasters__help">{tp("marketHint")}</div>
              </div>
            ) : null}

            {error ? (
              <div className="barbermasters__alert barbermasters__alert--inModal">{error}</div>
            ) : null}
          </div>

          <div className="barbermasters__modalFooter pl-5 pb-5 flex gap-3">
            <button
              type="submit"
              className="barbermasters__btn barbermasters__btn--primary"
              disabled={saving || loading}
            >
              {saving
                ? t("common.saving")
                : selectedId
                  ? t("common.save")
                  : tp("createProfile")}
            </button>
            {selectedId ? (
              deleteConfirm ? (
                <>
                  <button
                    type="button"
                    className="barbermasters__btn barbermasters__btn--danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? t("common.deleting") : tp("confirmDelete")}
                  </button>
                  <button
                    type="button"
                    className="barbermasters__btn barbermasters__btn--secondary"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={saving}
                  >
                    {t("common.cancel")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="barbermasters__btn barbermasters__btn--danger"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={saving}
                >
                  {tp("deleteProfile")}
                </button>
              )
            ) : null}
            <button
              type="button"
              className="barbermasters__btn barbermasters__btn--secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t("common.close")}
            </button>
          </div>
        </form>
      </div>
    </div>
    </BarberMastersPortal>
  );
};

export default MarketSaleEmployeePayProfileModal;
