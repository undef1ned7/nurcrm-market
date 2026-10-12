import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@shared/api";
import {
  createCompanyMembership,
  listCompanyAgentRequests,
  listWarehouses,
  patchCompanyAgentCommonAccess,
} from "@entities/warehouse/api/warehouse";
import { useUser } from "@entities/user";
import { convertEmployeeAccessesToLabels } from "../employeeAccessLabels";
import { isSaleEmployeePayrollSector } from "../saleEmployeePayroll";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { getNewEmployeeAccessDefaults } from "@shared/lib/newEmployeeDefaultAccess";
import { ruLabelSys } from "../resolveEmployeeRoleLabel";
import {
  canAddEmployeeOnMarketStart,
  MARKET_START_EMPLOYEE_LIMIT_MESSAGE,
} from "@shared/lib/subscriptionPlan";
import {
  EMPLOYEES_LIST_URL,
  EMPLOYEES_CREATE_URL,
  EMPLOYEE_ITEM_URL,
  ROLES_LIST_URL,
  ROLE_CREATE_URL,
  ROLE_ITEM_URL,
  SYSTEM_ROLES,
  PAGE_SIZE,
  EMPTY_EMP_FORM,
  asArray,
  normalizeEmail,
  normalizeEmployee,
  fullName,
  sysCodeFromName,
  normalizeRoleName,
  pickApiError,
  focusFirstInvalid,
  validateEmployee,
  getMembershipCommonWarehouseIds,
  employeeBranchIds,
  pluralRu,
} from "../masters.utils";

export function useMastersPage() {
  const { t } = useTranslation();
  const { company, tariff, profile } = useUser();

  const [tab, setTab] = useState("masters");

  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageNotice, setPageNotice] = useState("");

  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  const [pageEmp, setPageEmp] = useState(1);
  const [pageRole, setPageRole] = useState(1);

  const [roleCreateOpen, setRoleCreateOpen] = useState(false);
  const [roleCreateName, setRoleCreateName] = useState("");
  const [roleCreateSaving, setRoleCreateSaving] = useState(false);
  const [roleCreateErr, setRoleCreateErr] = useState("");

  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [roleEditId, setRoleEditId] = useState<any>(null);
  const [roleEditName, setRoleEditName] = useState("");
  const [roleEditSaving, setRoleEditSaving] = useState(false);
  const [roleEditErr, setRoleEditErr] = useState("");

  const [roleDeletingIds, setRoleDeletingIds] = useState<any>(new Set());
  const [roleToDelete, setRoleToDelete] = useState<any>(null);

  const [empCreateOpen, setEmpCreateOpen] = useState(false);
  const [empEditOpen, setEmpEditOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [empAlerts, setEmpAlerts] = useState<any[]>([]);
  const [empFieldErrors, setEmpFieldErrors] = useState<any>({});
  const [empDeletingIds, setEmpDeletingIds] = useState<any>(new Set());
  const [empToDelete, setEmpToDelete] = useState<any>(null);
  const [empForm, setEmpForm] = useState<any>(EMPTY_EMP_FORM);
  const [editingEmpId, setEditingEmpId] = useState<any>(null);

  const [openLogin, setOpenLogin] = useState(false);
  const [employData, setEmployData] = useState<any>(null);
  const [copied, setCopied] = useState<any>(null);

  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessModalEmployee, setAccessModalEmployee] = useState<any>(null);
  const [accessModalAccesses, setAccessModalAccesses] = useState<any[]>([]);
  const [accessModalCanSellWholesale, setAccessModalCanSellWholesale] =
    useState(false);
  const [accessModalWarehouseMembership, setAccessModalWarehouseMembership] =
    useState<any>(null);
  const [
    accessModalWarehouseMembershipLoading,
    setAccessModalWarehouseMembershipLoading,
  ] = useState(false);

  const [warehouseAgentModalOpen, setWarehouseAgentModalOpen] = useState(false);
  const [warehouseAgentEmployee, setWarehouseAgentEmployee] = useState<any>(null);
  const [warehouseAgentCommonEnabled, setWarehouseAgentCommonEnabled] =
    useState(false);
  const [warehouseAgentAssignedWarehouse, setWarehouseAgentAssignedWarehouse] =
    useState("");
  const [warehouseAgentCommonWarehouses, setWarehouseAgentCommonWarehouses] =
    useState<any[]>([]);
  const [warehouseAgentCanSellWholesale, setWarehouseAgentCanSellWholesale] =
    useState(false);
  const [warehouseAgentSaving, setWarehouseAgentSaving] = useState(false);
  const [warehouseAgentError, setWarehouseAgentError] = useState("");
  const [warehouseAgentWarehouses, setWarehouseAgentWarehouses] = useState<any[]>([]);
  const [warehouseAgentWarehousesLoading, setWarehouseAgentWarehousesLoading] =
    useState(false);
  const [
    warehouseAgentExistingMembership,
    setWarehouseAgentExistingMembership,
  ] = useState<any>(null);
  const [warehouseAgentMembershipLoading, setWarehouseAgentMembershipLoading] =
    useState(false);

  const sectorName = String(company?.sector?.name || "").trim();
  const isWarehouseSector = sectorName === "Склад";
  const isOwnerOrAdmin = profile?.role === "owner" || profile?.role === "admin";
  const isCafeSector = sectorName === "Кафе";
  const isSalePayrollSector = isSaleEmployeePayrollSector(sectorName);
  const canAddEmployeeByStartPlan = useMemo(
    () =>
      canAddEmployeeOnMarketStart({
        tariffName: tariff || company?.subscription_plan?.name,
        sectorName,
        employees,
      }),
    [tariff, company?.subscription_plan?.name, sectorName, employees],
  );

  const copyToClipboard = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  /* ========= Fetch ========= */
  const fetchEmployees = useCallback(async () => {
    const res = await api.get(EMPLOYEES_LIST_URL);
    setEmployees(asArray(res.data).map(normalizeEmployee));
  }, []);
  const fetchRoles = useCallback(async () => {
    const res = await api.get(ROLES_LIST_URL);
    setRoles(asArray(res.data).map((r) => ({ id: r.id, name: r.name || "" })));
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get("/users/branches/");
      const branchesList = asArray(res.data);
      setBranches(branchesList);
    } catch (err: any) {
      console.error("Ошибка загрузки филиалов:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([fetchEmployees(), fetchRoles(), fetchBranches()]);
      } catch (err: any) {
        const errorMessage = validateResErrors(err, "Ошибка загрузки данных. ");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchEmployees, fetchRoles, fetchBranches]);

  /* ========= Derived ========= */
  const roleById = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => {
      if (r.id != null && String(r.id).trim() !== "") {
        m.set(r.id, r);
      }
    });
    return m;
  }, [roles]);

  const roleOptions = useMemo(() => {
    const sys = SYSTEM_ROLES.map((code) => ({
      key: `sys:${code}`,
      label: ruLabelSys(code),
    }));
    const cus = roles
      .filter((r) => !sysCodeFromName(r.name))
      .map((r) => ({ key: `cus:${r.id}`, label: String(r.name || "").trim() }));
    const seen = new Set<any>();
    const out: any[] = [];
    for (const o of [...sys, ...cus]) {
      const k = o.label.trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(o);
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }, [roles]);

  const roleFilterOptions = useMemo(
    () => [
      { key: "ALL", label: t("crm.employees.allRoles") },
      ...roleOptions,
      { key: "NONE", label: t("crm.employees.noRole") },
    ],
    [roleOptions, t],
  );

  const filteredEmployees = useMemo(() => {
    const t = q.trim().toLowerCase();
    let base = employees;

    if (filterRole === "NONE") {
      base = base.filter((u) => !u.role && !u.custom_role);
    } else if (filterRole !== "ALL") {
      base = base.filter((u) => {
        if (filterRole.startsWith("sys:"))
          return u.role === filterRole.slice(4);
        if (filterRole.startsWith("cus:"))
          return String(u.custom_role) === filterRole.slice(4);
        return true;
      });
    }

    if (!t) return base;
    return base.filter((e) =>
      [fullName(e), e.email, e.role_display, ruLabelSys(e.role)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [employees, q, filterRole]);

  const rolesForList = useMemo(() => {
    const sys = SYSTEM_ROLES.map((code) => ({
      id: `sys:${code}`,
      name: ruLabelSys(code),
      _sys: true,
    }));
    const seen = new Set<any>();
    const dedup: any[] = [];
    for (const r of roles) {
      if (sysCodeFromName(r.name)) continue;
      const k = String(r.name || "")
        .trim()
        .toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        dedup.push({ id: r.id, name: r.name || "", _sys: false });
      }
    }
    const base = [...sys, ...dedup].sort((a, b) =>
      a.name.localeCompare(b.name, "ru"),
    );
    const t = q.trim().toLowerCase();
    if (!t) return base;
    return base.filter((r) => (r.name || "").toLowerCase().includes(t));
  }, [roles, q]);

  useEffect(() => {
    setPageEmp(1);
    setPageRole(1);
  }, [q, tab, filteredEmployees.length, rolesForList.length, filterRole]);

  const totalPagesEmp = Math.max(
    1,
    Math.ceil(filteredEmployees.length / PAGE_SIZE),
  );
  const totalPagesRole = Math.max(
    1,
    Math.ceil(rolesForList.length / PAGE_SIZE),
  );
  const pageSafeEmp = Math.min(pageEmp, totalPagesEmp);
  const pageSafeRole = Math.min(pageRole, totalPagesRole);
  const empRows = filteredEmployees.slice(
    (pageSafeEmp - 1) * PAGE_SIZE,
    pageSafeEmp * PAGE_SIZE,
  );
  const roleRows = rolesForList.slice(
    (pageSafeRole - 1) * PAGE_SIZE,
    pageSafeRole * PAGE_SIZE,
  );

  /* ========= Roles CRUD ========= */
  const submitRoleCreate = async (e) => {
    e.preventDefault();
    const name = roleCreateName.trim();
    if (!name) return setRoleCreateErr("Укажите название роли.");
    if (sysCodeFromName(name))
      return setRoleCreateErr("Это имя занято системной ролью.");
    const dup = roles.some(
      (r) => normalizeRoleName(r.name) === normalizeRoleName(name),
    );
    if (dup) return setRoleCreateErr("Роль с таким названием уже существует.");

    setRoleCreateSaving(true);
    setRoleCreateErr("");
    try {
      await api.post(ROLE_CREATE_URL, { name });
      await fetchRoles();
      setRoleCreateOpen(false);
      setRoleCreateName("");
    } catch (err: any) {
      setRoleCreateErr(pickApiError(err, "Не удалось создать роль."));
    } finally {
      setRoleCreateSaving(false);
    }
  };

  const openRoleEdit = (r) => {
    if (r._sys) return;
    setRoleEditId(r.id);
    setRoleEditName(r.name || "");
    setRoleEditErr("");
    setRoleEditOpen(true);
  };

  const submitRoleEdit = async (e) => {
    e.preventDefault();
    if (!roleEditId) return;
    const name = roleEditName.trim();
    if (!name) return setRoleEditErr("Укажите название роли.");
    if (sysCodeFromName(name))
      return setRoleEditErr("Это имя зарезервировано системной ролью.");
    const dup = roles.some(
      (r) =>
        r.id !== roleEditId &&
        normalizeRoleName(r.name) === normalizeRoleName(name),
    );
    if (dup) return setRoleEditErr("Роль с таким названием уже существует.");

    setRoleEditSaving(true);
    setRoleEditErr("");
    try {
      await api.put(ROLE_ITEM_URL(roleEditId), { name });
      await fetchRoles();
      setRoleEditOpen(false);
      setRoleEditId(null);
      setRoleEditName("");
    } catch (err: any) {
      setRoleEditErr(pickApiError(err, "Не удалось обновить роль."));
    } finally {
      setRoleEditSaving(false);
    }
  };

  const doRemoveRole = async () => {
    const r = roleToDelete;
    if (!r || r._sys) return;
    setRoleDeletingIds((p) => new Set(p).add(r.id));
    setPageNotice("");
    try {
      await api.delete(ROLE_ITEM_URL(r.id));
      await fetchRoles();
    } catch (err: any) {
      setPageNotice(pickApiError(err, "Не удалось удалить роль."));
    } finally {
      setRoleDeletingIds((p) => {
        const n = new Set(p);
        n.delete(r.id);
        return n;
      });
      setRoleToDelete(null);
    }
  };

  /* ========= Employees CRUD ========= */
  const openEmpCreate = () => {
    if (!canAddEmployeeByStartPlan) {
      setPageNotice(MARKET_START_EMPLOYEE_LIMIT_MESSAGE);
      return;
    }
    setEmpAlerts([]);
    setEmpFieldErrors({});
    setEmpForm(EMPTY_EMP_FORM);
    setEmpCreateOpen(true);
  };

  const showBranchSelect = useMemo(() => {
    const tariffLower = String(tariff || "").toLowerCase();
    return tariffLower !== "старт" && tariffLower !== "start";
  }, [tariff]);

  const submitEmployeeCreate = async (e) => {
    e.preventDefault();
    if (!canAddEmployeeByStartPlan) {
      setEmpAlerts([MARKET_START_EMPLOYEE_LIMIT_MESSAGE]);
      return;
    }
    const { errs, alerts } = validateEmployee(
      empForm,
      employees,
      false,
      null,
      t,
    );
    if (alerts.length) {
      setEmpFieldErrors(errs);
      setEmpAlerts([t("crm.employees.validate.fixFormErrors"), ...alerts]);
      focusFirstInvalid(errs);
      return;
    }
    const email = normalizeEmail(empForm.email);
    const accessDefaults = getNewEmployeeAccessDefaults(sectorName);
    const payload: any = {
      email,
      first_name: empForm.first_name.trim(),
      last_name: empForm.last_name.trim(),
      phone_number: empForm.phone_number.trim(),
      track_number: empForm.track_number.trim(),
      ...accessDefaults,
    };
    if (empForm.roleChoice.startsWith("sys:"))
      payload.role = empForm.roleChoice.slice(4);
    else if (empForm.roleChoice.startsWith("cus:"))
      payload.custom_role = empForm.roleChoice.slice(4);
    if (showBranchSelect && empForm.branches.length > 0) {
      payload.branches = empForm.branches;
    }

    setEmpSaving(true);
    setEmpAlerts([]);
    try {
      const { data } = await api.post(EMPLOYEES_CREATE_URL, payload);
      const newId = data?.id;
      if (newId) {
        try {
          await api.patch(EMPLOYEE_ITEM_URL(newId), accessDefaults);
        } catch (syncErr: any) {
          console.error(syncErr);
          setPageNotice(
            pickApiError(
              syncErr,
              "Сотрудник создан, но доступ к настройкам не применился автоматически. Откройте «Доступы» и сохраните вручную.",
            ),
          );
        }
      }
      await fetchEmployees();
      setEmployData(data);
      setOpenLogin(true);
      setEmpCreateOpen(false);
      setEmpForm(EMPTY_EMP_FORM);
    } catch (err: any) {
      const msg = pickApiError(err, "Не удалось создать сотрудника.");
      setEmpAlerts([msg]);
    } finally {
      setEmpSaving(false);
    }
  };

  const openEmpEdit = (u) => {
    const roleChoice = u.role
      ? `sys:${u.role}`
      : u.custom_role
        ? `cus:${u.custom_role}`
        : "";
    const branchIds = employeeBranchIds(u);
    setEditingEmpId(u.id);
    setEmpForm({
      email: u.email || "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      roleChoice,
      track_number: u.track_number || "",
      phone_number: u.phone_number || "",
      branch: branchIds[0] || "",
      branches: branchIds,
    });
    setEmpAlerts([]);
    setEmpFieldErrors({});
    setEmpEditOpen(true);
  };

  const submitEmployeeEdit = async (e) => {
    e.preventDefault();
    if (!editingEmpId) return;
    const { errs, alerts } = validateEmployee(
      empForm,
      employees,
      true,
      editingEmpId,
      t,
    );
    if (alerts.length) {
      setEmpFieldErrors(errs);
      setEmpAlerts([t("crm.employees.validate.fixFormErrors"), ...alerts]);
      focusFirstInvalid(errs);
      return;
    }
    const payload: any = {
      email: normalizeEmail(empForm.email),
      first_name: empForm.first_name.trim(),
      last_name: empForm.last_name.trim(),
      phone_number: empForm.phone_number.trim(),
      track_number: empForm.track_number.trim(),
      role: null,
      custom_role: null,
    };
    if (empForm.roleChoice.startsWith("sys:"))
      payload.role = empForm.roleChoice.slice(4);
    else if (empForm.roleChoice.startsWith("cus:"))
      payload.custom_role = empForm.roleChoice.slice(4);
    if (showBranchSelect && empForm.branches.length > 0) {
      payload.branches = empForm.branches;
    }

    setEmpSaving(true);
    setEmpAlerts([]);
    try {
      await api.patch(EMPLOYEE_ITEM_URL(editingEmpId), payload);
      await fetchEmployees();
      setEmpEditOpen(false);
      setEditingEmpId(null);
      setEmpForm(EMPTY_EMP_FORM);
    } catch (err: any) {
      const msg = pickApiError(err, "Не удалось обновить сотрудника.");
      setEmpAlerts([msg]);
    } finally {
      setEmpSaving(false);
    }
  };

  const doRemoveEmployee = async () => {
    const u = empToDelete;
    if (!u) return;
    setEmpDeletingIds((p) => new Set(p).add(u.id));
    setPageNotice("");
    try {
      await api.delete(EMPLOYEE_ITEM_URL(u.id));
      await fetchEmployees();
    } catch (err: any) {
      setPageNotice(pickApiError(err, "Не удалось удалить сотрудника."));
    } finally {
      setEmpDeletingIds((p) => {
        const n = new Set(p);
        n.delete(u.id);
        return n;
      });
      setEmpToDelete(null);
    }
  };

  /* ========= Employee Access Management ========= */
  const convertBackendAccessesToLabels = useCallback(
    (employee) =>
      convertEmployeeAccessesToLabels(employee, company?.sector?.name),
    [company?.sector?.name],
  );

  const loadWarehouseMembershipForEmployee = useCallback(
    async (employeeId) => {
      if (!employeeId || !isWarehouseSector || !isOwnerOrAdmin) {
        setAccessModalWarehouseMembership(null);
        setAccessModalCanSellWholesale(false);
        setAccessModalWarehouseMembershipLoading(false);
        return;
      }

      setAccessModalWarehouseMembershipLoading(true);
      try {
        const data = await listCompanyAgentRequests({ status: "active" });
        const list = asArray(data);
        const membership =
          list.find((item) => String(item.user) === String(employeeId)) || null;
        setAccessModalWarehouseMembership(membership);
        setAccessModalCanSellWholesale(Boolean(membership?.can_sell_wholesale));
      } catch (err: any) {
        console.error("Не удалось загрузить данные агента склада:", err);
        setAccessModalWarehouseMembership(null);
        setAccessModalCanSellWholesale(false);
      } finally {
        setAccessModalWarehouseMembershipLoading(false);
      }
    },
    [isOwnerOrAdmin, isWarehouseSector],
  );

  const openAccessModal = async (employee) => {
    try {
      const res = await api.get(EMPLOYEE_ITEM_URL(employee.id));
      const fullEmployee = res.data;
      const accesses = convertBackendAccessesToLabels(fullEmployee);
      setAccessModalEmployee(fullEmployee);
      setAccessModalAccesses(accesses);
      setAccessModalOpen(true);
      await loadWarehouseMembershipForEmployee(fullEmployee.id);
    } catch (err: any) {
      console.error("Ошибка при открытии модального окна доступов:", err);
      setPageNotice(
        pickApiError(err, "Не удалось загрузить доступы сотрудника."),
      );
    }
  };

  const handleSaveEmployeeAccesses = async (newAccessesPayload) => {
    if (!accessModalEmployee) return;
    setEmpSaving(true);
    setPageNotice("");
    try {
      await api.patch(
        EMPLOYEE_ITEM_URL(accessModalEmployee.id),
        newAccessesPayload,
      );

      if (
        isWarehouseSector &&
        isOwnerOrAdmin &&
        accessModalWarehouseMembership?.id &&
        Boolean(accessModalWarehouseMembership.can_sell_wholesale) !==
          Boolean(accessModalCanSellWholesale)
      ) {
        await patchCompanyAgentCommonAccess(accessModalWarehouseMembership.id, {
          can_sell_wholesale: Boolean(accessModalCanSellWholesale),
        });
      }

      await fetchEmployees();
      setAccessModalOpen(false);
      setAccessModalEmployee(null);
      setAccessModalAccesses([]);
      setAccessModalCanSellWholesale(false);
      setAccessModalWarehouseMembership(null);
    } catch (err: any) {
      setPageNotice(
        pickApiError(err, "Не удалось обновить доступы сотрудника."),
      );
    } finally {
      setEmpSaving(false);
    }
  };

  /* ========= Warehouse agent ========= */
  const loadWarehouseAgentWarehouses = useCallback(async () => {
    if (warehouseAgentWarehouses.length > 0) return warehouseAgentWarehouses;
    try {
      setWarehouseAgentWarehousesLoading(true);
      const res = await listWarehouses({ page_size: 1000 });
      const list = Array.isArray(res?.results) ? res.results : res || [];
      setWarehouseAgentWarehouses(list);
      return list;
    } catch (err: any) {
      console.error("Не удалось загрузить склады для выбора:", err);
      setWarehouseAgentError(
        pickApiError(err, "Не удалось загрузить список складов."),
      );
      return [];
    } finally {
      setWarehouseAgentWarehousesLoading(false);
    }
  }, [warehouseAgentWarehouses]);

  const loadWarehouseAgentMembership = useCallback(
    async (employeeId) => {
      if (!employeeId || !isWarehouseSector) {
        setWarehouseAgentExistingMembership(null);
        return null;
      }

      setWarehouseAgentMembershipLoading(true);
      try {
        const data = await listCompanyAgentRequests({ status: "active" });
        const list = asArray(data);
        const membership =
          list.find((item) => String(item.user) === String(employeeId)) || null;
        setWarehouseAgentExistingMembership(membership);
        return membership;
      } catch (err: any) {
        console.error("Не удалось загрузить данные агента склада:", err);
        setWarehouseAgentExistingMembership(null);
        return null;
      } finally {
        setWarehouseAgentMembershipLoading(false);
      }
    },
    [isWarehouseSector],
  );

  const getWarehouseAgentLabel = useCallback(
    (warehouseId) => {
      if (!warehouseId) return "Все склады компании";
      const warehouse = warehouseAgentWarehouses.find(
        (item) => String(item.id) === String(warehouseId),
      );
      return warehouse?.name || warehouse?.title || warehouseId;
    },
    [warehouseAgentWarehouses],
  );

  const openWarehouseAgentModal = async (employee) => {
    if (!employee?.id) return;
    setWarehouseAgentEmployee(employee);
    setWarehouseAgentCommonEnabled(false);
    setWarehouseAgentAssignedWarehouse("");
    setWarehouseAgentCommonWarehouses([]);
    setWarehouseAgentCanSellWholesale(false);
    setWarehouseAgentError("");
    setWarehouseAgentExistingMembership(null);
    setWarehouseAgentModalOpen(true);

    const [, membership] = await Promise.all([
      loadWarehouseAgentWarehouses(),
      loadWarehouseAgentMembership(employee.id),
    ]);

    if (membership) {
      setWarehouseAgentAssignedWarehouse(
        membership.assigned_warehouse
          ? String(membership.assigned_warehouse)
          : "",
      );
      setWarehouseAgentCommonEnabled(Boolean(membership.common_access_enabled));
      setWarehouseAgentCommonWarehouses(
        getMembershipCommonWarehouseIds(membership),
      );
      setWarehouseAgentCanSellWholesale(Boolean(membership.can_sell_wholesale));
    }
  };

  const closeWarehouseAgentModal = () => {
    if (warehouseAgentSaving) return;
    setWarehouseAgentModalOpen(false);
    setWarehouseAgentEmployee(null);
    setWarehouseAgentCommonEnabled(false);
    setWarehouseAgentAssignedWarehouse("");
    setWarehouseAgentCommonWarehouses([]);
    setWarehouseAgentCanSellWholesale(false);
    setWarehouseAgentError("");
    setWarehouseAgentExistingMembership(null);
  };

  const submitWarehouseAgent = async (e) => {
    e?.preventDefault?.();
    if (!warehouseAgentEmployee?.id || warehouseAgentSaving) return;
    const assignedWarehouse = warehouseAgentAssignedWarehouse.trim();
    const commonWarehouses = Array.from(
      new Set(warehouseAgentCommonWarehouses.filter(Boolean).map(String)),
    );
    if (warehouseAgentCommonEnabled && commonWarehouses.length === 0) {
      setWarehouseAgentError(
        "Выберите хотя бы один склад для общего доступа.",
      );
      return;
    }
    setWarehouseAgentSaving(true);
    setWarehouseAgentError("");
    setPageNotice("");
    try {
      if (warehouseAgentExistingMembership?.id) {
        const patchPayload: any = {
          assigned_warehouse: assignedWarehouse || null,
          common_access_enabled: warehouseAgentCommonEnabled,
          can_sell_wholesale: Boolean(warehouseAgentCanSellWholesale),
        };
        if (warehouseAgentCommonEnabled) {
          patchPayload.common_warehouses = commonWarehouses;
        }
        await patchCompanyAgentCommonAccess(
          warehouseAgentExistingMembership.id,
          patchPayload,
        );
        setPageNotice("Настройки агента склада обновлены.");
      } else {
        const payload: any = {
          user: warehouseAgentEmployee.id,
          assigned_warehouse: assignedWarehouse || null,
        };
        if (warehouseAgentCommonEnabled) {
          payload.common_access_enabled = true;
          payload.common_warehouses = commonWarehouses;
        }
        if (warehouseAgentCanSellWholesale) {
          payload.can_sell_wholesale = true;
        }
        await createCompanyMembership(payload);
        setPageNotice("Сотрудник назначен агентом склада.");
      }
      closeWarehouseAgentModal();
    } catch (err: any) {
      setWarehouseAgentError(
        pickApiError(err, "Не удалось назначить сотрудника агентом склада."),
      );
    } finally {
      setWarehouseAgentSaving(false);
    }
  };

  const toggleWarehouseAgentCommonWarehouse = (warehouseId) => {
    const id = String(warehouseId);
    setWarehouseAgentCommonWarehouses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const employeesSubtitle = loading
    ? "Загрузка…"
    : tab === "roles"
      ? `${rolesForList.length} ${pluralRu(rolesForList.length, ["роль", "роли", "ролей"])}${
          rolesForList.length > PAGE_SIZE
            ? ` · стр. ${pageSafeRole}/${totalPagesRole}`
            : ""
        }`
      : `${filteredEmployees.length} ${pluralRu(filteredEmployees.length, ["сотрудник", "сотрудника", "сотрудников"])}${
          filteredEmployees.length > PAGE_SIZE
            ? ` · стр. ${pageSafeEmp}/${totalPagesEmp}`
            : ""
        }`;

  return {
    company,
    tariff,
    profile,
    sectorName,
    isWarehouseSector,
    isOwnerOrAdmin,
    isCafeSector,
    isSalePayrollSector,
    canAddEmployeeByStartPlan,

    tab,
    setTab,
    employees,
    loading,
    error,
    pageNotice,
    q,
    setQ,
    filterRole,
    setFilterRole,
    pageEmp,
    setPageEmp,
    pageRole,
    setPageRole,

    roleCreateOpen,
    setRoleCreateOpen,
    roleCreateName,
    setRoleCreateName,
    roleCreateSaving,
    roleCreateErr,
    submitRoleCreate,

    roleEditOpen,
    setRoleEditOpen,
    roleEditName,
    setRoleEditName,
    roleEditSaving,
    roleEditErr,
    submitRoleEdit,
    openRoleEdit,

    roleDeletingIds,
    roleToDelete,
    setRoleToDelete,
    doRemoveRole,

    empCreateOpen,
    setEmpCreateOpen,
    empEditOpen,
    setEmpEditOpen,
    empSaving,
    empAlerts,
    empFieldErrors,
    empDeletingIds,
    empToDelete,
    setEmpToDelete,
    empForm,
    setEmpForm,
    openEmpCreate,
    openEmpEdit,
    submitEmployeeCreate,
    submitEmployeeEdit,
    doRemoveEmployee,
    showBranchSelect,
    branches,

    openLogin,
    setOpenLogin,
    employData,
    copied,
    copyToClipboard,

    accessModalOpen,
    setAccessModalOpen,
    accessModalEmployee,
    accessModalAccesses,
    accessModalCanSellWholesale,
    setAccessModalCanSellWholesale,
    accessModalWarehouseMembership,
    accessModalWarehouseMembershipLoading,
    openAccessModal,
    handleSaveEmployeeAccesses,

    warehouseAgentModalOpen,
    warehouseAgentEmployee,
    warehouseAgentCommonEnabled,
    setWarehouseAgentCommonEnabled,
    warehouseAgentAssignedWarehouse,
    setWarehouseAgentAssignedWarehouse,
    warehouseAgentCommonWarehouses,
    warehouseAgentCanSellWholesale,
    setWarehouseAgentCanSellWholesale,
    warehouseAgentSaving,
    warehouseAgentError,
    warehouseAgentWarehouses,
    warehouseAgentWarehousesLoading,
    warehouseAgentExistingMembership,
    warehouseAgentMembershipLoading,
    getWarehouseAgentLabel,
    openWarehouseAgentModal,
    closeWarehouseAgentModal,
    submitWarehouseAgent,
    toggleWarehouseAgentCommonWarehouse,

    roleById,
    roleOptions,
    roleFilterOptions,
    filteredEmployees,
    rolesForList,
    totalPagesEmp,
    totalPagesRole,
    pageSafeEmp,
    pageSafeRole,
    empRows,
    roleRows,
    employeesSubtitle,
    PAGE_SIZE,
  };
}
