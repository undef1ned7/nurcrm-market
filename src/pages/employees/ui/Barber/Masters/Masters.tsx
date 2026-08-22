import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaEdit, FaLock, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import RoleCreateModal from "./modals/RoleCreateModal";
import RoleEditModal from "./modals/RoleEditModal";
import EmployeeCreateModal from "./modals/EmployeeCreateModal";
import EmployeeEditModal from "./modals/EmployeeEditModal";
import NewEmployeeCredentialsModal from "./modals/NewEmployeeCredentialsModal";
import DeleteRoleModal from "./modals/DeleteRoleModal";
import DeleteEmployeeModal from "./modals/DeleteEmployeeModal";
import EmployeeAccessModal from "./modals/EmployeeAccessModal";
import WarehouseAgentModal from "./modals/WarehouseAgentModal";
import RoleSelect from "./RoleSelect";
import MastersPager from "./MastersPager";
import { useMastersPage } from "./hooks/useMastersPage";
import {
  resolveEmployeeRoleLabel,
} from "./resolveEmployeeRoleLabel";
import {
  employPayrollDetailPath,
} from "./saleEmployeePayroll";
import { fullName, BARBER_CAN_VIEW_CLIENT_DOCUMENTS } from "./masters.utils";
import { MARKET_START_EMPLOYEE_LIMIT_MESSAGE } from "@shared/lib/subscriptionPlan";
import {
  PageShell,
  PageHeader,
  FilterBar,
} from "@shared/ui/page-shell";
import "./Masters.scss";

const Masters = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const m = useMastersPage();

  return (
    <PageShell className="barbermasters">
      <PageHeader
        title={t("crm.employees.pageTitle")}
        subtitle={m.employeesSubtitle}
        actions={
          m.tab === "roles" ? (
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => m.setRoleCreateOpen(true)}
              title={t("crm.employees.addRole")}
              aria-label={t("crm.employees.addRole")}
            >
              <FaPlus />
              <span className="nur-btn__label">{t("crm.employees.addRole")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={m.openEmpCreate}
              disabled={!m.canAddEmployeeByStartPlan}
              title={
                !m.canAddEmployeeByStartPlan
                  ? MARKET_START_EMPLOYEE_LIMIT_MESSAGE
                  : t("crm.employees.addEmployee")
              }
              aria-label={t("crm.employees.addEmployee")}
            >
              <FaPlus />
              <span className="nur-btn__label">{t("crm.employees.add")}</span>
            </button>
          )
        }
      />

      <FilterBar className="barbermasters__toolbar">
        <div className="barbermasters__tabs">
          <button
            type="button"
            className={`nur-btn nur-btn--sm ${
              m.tab === "roles" ? "nur-btn--primary" : "nur-btn--secondary"
            }`}
            onClick={() => m.setTab("roles")}
          >
            {t("crm.employees.roles")}
          </button>
          <button
            type="button"
            className={`nur-btn nur-btn--sm ${
              m.tab === "masters" ? "nur-btn--primary" : "nur-btn--secondary"
            }`}
            onClick={() => m.setTab("masters")}
          >
            {t("crm.employees.employeesTab")}
          </button>
        </div>

        {m.tab === "masters" && (
          <RoleSelect
            options={m.roleFilterOptions}
            value={m.filterRole}
            onChange={m.setFilterRole}
            placeholder={t("crm.employees.allRoles")}
            hideCurrentLabelInMenu
            className="barbermasters__roleFilter"
          />
        )}

        <div className="barbermasters__search">
          <FaSearch className="barbermasters__searchIcon" />
          <input
            className="nur-input barbermasters__searchInput"
            placeholder={
              m.tab === "roles"
                ? t("crm.employees.searchRoles")
                : t("crm.employees.searchEmployees")
            }
            value={m.q}
            onChange={(e: any) => m.setQ(e.target.value)}
            aria-label={t("common.search")}
          />
        </div>
      </FilterBar>

      {!!m.error && <div className="barbermasters__alert">{m.error}</div>}
      {!!m.pageNotice && (
        <div className="barbermasters__alert">{m.pageNotice}</div>
      )}
      {m.loading && <div className="barbermasters__alert">{t("common.loading")}</div>}

      {!m.loading && m.tab === "roles" && (
        <>
          <div className="barbermasters__list">
            {m.roleRows.map((r: any) => (
              <article key={r.id} className="barbermasters__card">
                <div className="barbermasters__cardLeft">
                  <div className="barbermasters__avatar">
                    {(r.name || "•").trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="barbermasters__nameRow">
                      <h4 className="barbermasters__name">
                        {r.name || t("crm.employees.noTitle")}
                      </h4>
                    </div>
                    {r._sys && (
                      <div className="barbermasters__meta">
                        <span className="bm-item">{t("crm.employees.systemRole")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="barbermasters__cardActions">
                  <button
                    className="nur-btn nur-btn--secondary"
                    onClick={() => m.openRoleEdit(r)}
                    disabled={r._sys}
                    title={
                      r._sys
                        ? t("crm.employees.cannotEditSystemRole")
                        : t("common.edit")
                    }
                  >
                    <FaEdit />
                    <span className="barbermasters__btnText">
                      {t("common.edit")}
                    </span>
                  </button>
                  <button
                    className="nur-btn nur-btn--danger"
                    onClick={() => m.setRoleToDelete(r)}
                    disabled={r._sys || m.roleDeletingIds.has(r.id)}
                    title={
                      r._sys
                        ? t("crm.employees.cannotDeleteSystemRole")
                        : t("common.delete")
                    }
                  >
                    <FaTrash />
                    <span className="barbermasters__btnText">
                      {m.roleDeletingIds.has(r.id)
                        ? t("common.deleting")
                        : t("common.delete")}
                    </span>
                  </button>
                </div>
              </article>
            ))}
            {m.rolesForList.length === 0 && (
              <div className="barbermasters__alert">{t("crm.employees.noRoles")}</div>
            )}
          </div>

          {m.rolesForList.length > m.PAGE_SIZE && (
            <MastersPager
              page={m.pageSafeRole}
              total={m.totalPagesRole}
              onChange={m.setPageRole}
            />
          )}
        </>
      )}

      {!m.loading && m.tab === "masters" && (
        <>
          <div className="barbermasters__list">
            {m.empRows.map((u: any) => {
              const initial =
                (fullName(u) || u.email || "•")
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "•";
              const roleLabel = resolveEmployeeRoleLabel(u, m.roleById);
              const cafeOpenDetail = m.isCafeSector && u.role !== "owner";
              const salePayrollOpenDetail =
                m.isSalePayrollSector && u.role !== "owner";
              const openDetail = cafeOpenDetail || salePayrollOpenDetail;
              return (
                <article key={u.id} className="barbermasters__card">
                  <div
                    className={`barbermasters__cardLeft${
                      openDetail ? " barbermasters__cardLeft--clickable" : ""
                    }`}
                    role={openDetail ? "button" : undefined}
                    tabIndex={openDetail ? 0 : undefined}
                    title={
                      openDetail
                        ? t("crm.employees.employeeCardHint")
                        : undefined
                    }
                    onClick={
                      openDetail
                        ? () =>
                            navigate(
                              cafeOpenDetail
                                ? `/crm/employ/${u.id}`
                                : employPayrollDetailPath(m.sectorName, u.id) ||
                                    "/crm/employ",
                            )
                        : undefined
                    }
                    onKeyDown={
                      openDetail
                        ? (e: any) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(
                                cafeOpenDetail
                                  ? `/crm/employ/${u.id}`
                                  : employPayrollDetailPath(
                                      m.sectorName,
                                      u.id,
                                    ) || "/crm/employ",
                              );
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="barbermasters__avatar">{initial}</div>
                    <div>
                      <div className="barbermasters__nameRow">
                        <h4 className="barbermasters__name">
                          {fullName(u) || t("crm.employees.noName")}
                        </h4>
                      </div>
                      <div className="barbermasters__meta">
                        <span className="bm-item">{u.email || "—"}</span>
                        <span className="bm-item">{roleLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="barbermasters__cardActions">
                    <button
                      className="nur-btn nur-btn--secondary"
                      onClick={() => m.openEmpEdit(u)}
                      title={t("crm.employees.editEmployee")}
                    >
                      <FaEdit />
                    </button>
                    {m.company?.sector?.name === "Производство" &&
                      (u.role === "agent" ||
                        roleLabel?.toLowerCase().includes("агент")) && (
                        <button
                          className="nur-btn nur-btn--secondary"
                          onClick={() =>
                            navigate(`/crm/production/agents/${u.id}/analytics`)
                          }
                          title={t("crm.employees.agentAnalytics")}
                        >
                          <span className="barbermasters__btnText">
                            📊 {t("crm.employees.analytics")}
                          </span>
                        </button>
                      )}
                    {m.company?.sector?.name === "Склад" &&
                      (u.role === "agent" ||
                        roleLabel?.toLowerCase().includes("агент")) && (
                        <button
                          className="nur-btn nur-btn--secondary"
                          onClick={() =>
                            navigate(
                              `/crm/warehouse/analytics?agent_id=${u.id}`,
                              { state: { agentName: fullName(u) } },
                            )
                          }
                          title={t("crm.employees.warehouseAgentAnalytics")}
                        >
                          <span className="barbermasters__btnText">
                            📊 {t("crm.employees.analytics")}
                          </span>
                        </button>
                      )}
                    {m.company?.sector?.name === "Склад" &&
                      (m.profile?.role === "owner" ||
                        m.profile?.role === "admin") && (
                        <button
                          className="nur-btn nur-btn--secondary"
                          onClick={() => m.openWarehouseAgentModal(u)}
                          title={t("crm.employees.assignWarehouseAgent")}
                        >
                          <span className="barbermasters__btnText">
                            🧑‍💼 {t("crm.employees.warehouseAgent")}
                          </span>
                        </button>
                      )}
                    <button
                      className="nur-btn nur-btn--secondary"
                      onClick={() => m.openAccessModal(u)}
                      title={t("crm.employees.manageAccesses")}
                      disabled={u.role === "owner"}
                    >
                      <FaLock />
                      <span className="barbermasters__btnText">
                        {t("crm.employees.accesses")}
                      </span>
                    </button>
                    <button
                      className="nur-btn nur-btn--danger"
                      onClick={() => m.setEmpToDelete(u)}
                      disabled={m.empDeletingIds.has(u.id)}
                      title={t("crm.employees.deleteEmployee")}
                    >
                      <FaTrash />
                      <span className="barbermasters__btnText">
                        {m.empDeletingIds.has(u.id)
                          ? t("common.deleting")
                          : t("common.delete")}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
            {m.filteredEmployees.length === 0 && m.employees.length > 0 && (
              <div className="barbermasters__alert">{t("crm.employees.notFound")}</div>
            )}
            {!m.loading && m.employees.length === 0 && (
              <div className="barbermasters__alert">{t("crm.employees.noEmployees")}</div>
            )}
          </div>

          {m.filteredEmployees.length > m.PAGE_SIZE && (
            <MastersPager
              page={m.pageSafeEmp}
              total={m.totalPagesEmp}
              onChange={m.setPageEmp}
            />
          )}
        </>
      )}

      <RoleCreateModal
        roleCreateOpen={m.roleCreateOpen}
        roleCreateSaving={m.roleCreateSaving}
        setRoleCreateOpen={m.setRoleCreateOpen}
        submitRoleCreate={m.submitRoleCreate}
        roleCreateName={m.roleCreateName}
        setRoleCreateName={m.setRoleCreateName}
        roleCreateErr={m.roleCreateErr}
      />
      <RoleEditModal
        roleEditOpen={m.roleEditOpen}
        roleEditSaving={m.roleEditSaving}
        setRoleEditOpen={m.setRoleEditOpen}
        submitRoleEdit={m.submitRoleEdit}
        roleEditName={m.roleEditName}
        setRoleEditName={m.setRoleEditName}
        roleEditErr={m.roleEditErr}
      />
      <EmployeeCreateModal
        empCreateOpen={m.empCreateOpen}
        empSaving={m.empSaving}
        setEmpCreateOpen={m.setEmpCreateOpen}
        empAlerts={m.empAlerts}
        empFieldErrors={m.empFieldErrors}
        empForm={m.empForm}
        setEmpForm={m.setEmpForm}
        submitEmployeeCreate={m.submitEmployeeCreate}
        company={m.company}
        roleOptions={m.roleOptions}
        showBranchSelect={m.showBranchSelect}
        branches={m.branches}
        RoleSelect={RoleSelect}
      />
      <EmployeeEditModal
        empEditOpen={m.empEditOpen}
        empSaving={m.empSaving}
        setEmpEditOpen={m.setEmpEditOpen}
        empAlerts={m.empAlerts}
        empFieldErrors={m.empFieldErrors}
        empForm={m.empForm}
        setEmpForm={m.setEmpForm}
        submitEmployeeEdit={m.submitEmployeeEdit}
        company={m.company}
        roleOptions={m.roleOptions}
        showBranchSelect={m.showBranchSelect}
        branches={m.branches}
        RoleSelect={RoleSelect}
      />
      <NewEmployeeCredentialsModal
        openLogin={m.openLogin}
        setOpenLogin={m.setOpenLogin}
        employData={m.employData}
        copied={m.copied}
        copyToClipboard={m.copyToClipboard}
      />
      <DeleteRoleModal
        roleToDelete={m.roleToDelete}
        setRoleToDelete={m.setRoleToDelete}
        doRemoveRole={m.doRemoveRole}
        roleDeletingIds={m.roleDeletingIds}
      />
      <DeleteEmployeeModal
        empToDelete={m.empToDelete}
        setEmpToDelete={m.setEmpToDelete}
        doRemoveEmployee={m.doRemoveEmployee}
        empDeletingIds={m.empDeletingIds}
        fullName={fullName}
      />
      <EmployeeAccessModal
        accessModalOpen={m.accessModalOpen}
        setAccessModalOpen={m.setAccessModalOpen}
        accessModalEmployee={m.accessModalEmployee}
        accessModalAccesses={m.accessModalAccesses}
        handleSaveEmployeeAccesses={m.handleSaveEmployeeAccesses}
        profile={m.profile}
        tariff={m.tariff}
        company={m.company}
        empSaving={m.empSaving}
        isWarehouseSector={m.isWarehouseSector}
        isOwnerOrAdmin={m.isOwnerOrAdmin}
        warehouseMembership={m.accessModalWarehouseMembership}
        warehouseMembershipLoading={m.accessModalWarehouseMembershipLoading}
        canSellWholesale={m.accessModalCanSellWholesale}
        onCanSellWholesaleChange={m.setAccessModalCanSellWholesale}
      />

      <WarehouseAgentModal
        open={m.warehouseAgentModalOpen}
        employee={m.warehouseAgentEmployee}
        existingMembership={m.warehouseAgentExistingMembership}
        assignedWarehouse={m.warehouseAgentAssignedWarehouse}
        setAssignedWarehouse={m.setWarehouseAgentAssignedWarehouse}
        commonEnabled={m.warehouseAgentCommonEnabled}
        setCommonEnabled={m.setWarehouseAgentCommonEnabled}
        commonWarehouses={m.warehouseAgentCommonWarehouses}
        canSellWholesale={m.warehouseAgentCanSellWholesale}
        setCanSellWholesale={m.setWarehouseAgentCanSellWholesale}
        warehouses={m.warehouseAgentWarehouses}
        warehousesLoading={m.warehouseAgentWarehousesLoading}
        membershipLoading={m.warehouseAgentMembershipLoading}
        saving={m.warehouseAgentSaving}
        error={m.warehouseAgentError}
        getWarehouseAgentLabel={m.getWarehouseAgentLabel}
        toggleCommonWarehouse={m.toggleWarehouseAgentCommonWarehouse}
        onSubmit={m.submitWarehouseAgent}
        onClose={m.closeWarehouseAgentModal}
      />

      {m.openLogin && null}
    </PageShell>
  );
};

export { RoleSelect };
export { BARBER_CAN_VIEW_CLIENT_DOCUMENTS };
export default Masters;
