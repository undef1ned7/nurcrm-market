import { useMemo, useCallback } from "react";
import { MENU_CONFIG } from "../config/menuConfig";
import { menuIcons } from "../config/menuIcons";
import { HIDE_RULES } from "../config/hideRules";
import { useMenuPermissions } from "./useMenuPermissions";
import { getAdditionalServicesForMenu } from "../config/additionalServicesConfig";
import { isStartPlan } from "@shared/lib/subscriptionPlan";
import { isBranchBoundProfile } from "@shared/lib/tools/branchContext";

/**
 * Хук для сборки финального списка пунктов меню
 */
export const useMenuItems = (
  company: any,
  sector: any,
  tariff: any,
  profile: any = null,
  cashflowRequestsEnabled: boolean = false,
  pendingRequestsCount: number | null = null,
) => {
  const { hasPermission, isAllowed, companyAllows } = useMenuPermissions();
  const hasMenuAccess = useCallback(
    (item: any) => {
      if (!item?.permission) return true;
      switch (item.permissionModel) {
        case "user":
          return hasPermission(item.permission) === true;
        case "company":
          return companyAllows(company, item.permission) === true;
        case "mixed":
          return isAllowed(company, item.permission);
        default:
          return hasPermission(item.permission) === true;
      }
    },
    [company, hasPermission, isAllowed, companyAllows],
  );
  /**
   * Вычисляет скрытые элементы на основе правил
   */
  const hiddenByRules = useMemo(() => {
    const result: { labels: Set<any>; toIncludes: any[] } = { labels: new Set(), toIncludes: [] };

    HIDE_RULES.forEach((rule: any) => {
      const when: any = rule?.when || {};
        const hide: any = rule?.hide || {};
      const sectorOk = !when.sector || when.sector === sector;
      const sectorInOk =
        !when.sectorIn ||
        !sector ||
        when.sectorIn.includes(sector);
      const sectorNotInOk =
        !when.sectorNotIn ||
        !sector ||
        !when.sectorNotIn.includes(sector);
      const tariffOk = !when.tariff || when.tariff === tariff;
      const tariffInOk =
        !when.tariffIn || (tariff && when.tariffIn.includes(tariff));
      const tariffNotInOk =
        !when.tariffNotIn || (tariff && !when.tariffNotIn.includes(tariff));

      if (
        sectorOk &&
        sectorInOk &&
        sectorNotInOk &&
        tariffOk &&
        tariffInOk &&
        tariffNotInOk
      ) {
        (hide.labels || []).forEach((l: any) => result.labels.add(l));
        (hide.toIncludes || []).forEach((p: any) => result.toIncludes.push(p));
      }
    });

    return result;
  }, [sector, tariff]);

  /** Прикрепляет бейдж-счётчик к пункту «Запросы» (badge — уже отформатированная строка). */
  const attachPendingBadge = useCallback(
    (items: any[]) => {
      const count = Number(pendingRequestsCount) || 0;
      if (count <= 0) return items;
      const badge = count > 99 ? "99+" : String(count);
      return items.map((item: any) =>
        item.to === "/crm/pending" ? { ...item, badge } : item,
      );
    },
    [pendingRequestsCount],
  );

  /**
   * Получает секторные пункты меню
   */
  const getSectorMenuItems = useCallback(() => {
    // Standalone market app — always show market menu
    const configKey: any = "market";
    const sectorConfig = (MENU_CONFIG.sector as any)[configKey] || [];

    // Для тарифа "Старт": магазин — только аналитика маркета; кафе — все пункты кроме кухни (повар/KDS); производство — без агента (передача, каталог, запросы); склад — без агента (заявки агентов)
    if (isStartPlan(tariff || company?.subscription_plan?.name)) {
      if (configKey === "cafe") {
        return sectorConfig.filter((item: any) => {
          if (item.to === "/crm/cafe/cook") return false;
          return hasPermission(item.permission);
        });
      }
      if (configKey === "production") {
        const skip = new Set([
          "/crm/production/agents",
          "/crm/production/catalog",
          "/crm/production/request",
        ]);
        return sectorConfig.filter(
          (item: any) =>
            !skip.has(item.to) &&
            (hasPermission(item.permission) ||
              (item.permission === "can_view_market_supplier" &&
                profile?.role === "owner")),
        );
      }
      if (configKey === "warehouse") {
        const skip = new Set(["/crm/warehouse/agents"]);
        return sectorConfig.filter(
          (item: any) => !skip.has(item.to) && hasPermission(item.permission),
        );
      }
      // «Старт»: аналитика + Сводка, Калькуляция, База знаний и Журнал ошибок
      // (ABC-анализ — с тарифа «Стандарт»)
      const startAllowed = new Set([
        "/crm/market/analytics",
        "/crm/market/summary",
        "/crm/market/calculator",
        "/crm/market/knowledge-base",
        "/crm/market/error-log",
      ]);
      const filteredItems = sectorConfig.filter((item: any) => {
        if (!startAllowed.has(item.to)) return false;
        return !item.permission || hasPermission(item.permission);
      });
      return filteredItems;
    }

    const filteredItems = sectorConfig.filter((item: any) => {
      if (item.requiresCashflowRequests && !cashflowRequestsEnabled) {
        return false;
      }
      if (item.ownerAdminOnly) {
        const isOwnerOrAdmin =
          profile?.role === "owner" || profile?.role === "admin";
        if (!isOwnerOrAdmin) return false;
      }
      if (
        "production" === configKey &&
        item.permission === "can_view_catalog" &&
        profile?.role === "owner"
      ) {
        return true;
      }
      // Владельцу показываем «Поставщики» в Производстве даже без права
      if (
        "production" === configKey &&
        item.permission === "can_view_market_supplier" &&
        profile?.role === "owner"
      ) {
        return true;
      }
      // Владельцу показываем «Зарплату» в Услугах/Барбершопе/Стоматологии даже
      // без права от бэка (can_view_salary может отсутствовать в профиле,
      // пока бэк не выдаёт его владельцу явно — см. docs/services/salary.md)
      if (
        ["services", "barber", "dentistry"].includes(configKey as any) &&
        item.permission === "can_view_salary" &&
        profile?.role === "owner"
      ) {
        return true;
      }
      // Пункты без права (Сводка, База знаний, Журнал ошибок) видны всем
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });

    return attachPendingBadge(filteredItems);
  }, [company, hasPermission, profile, tariff, cashflowRequestsEnabled, attachPendingBadge]);

  /**
   * Получает дополнительные услуги
   */
  const getAdditionalServices = useCallback(() => {
    /** Для сайдбара: company-флаги сами по себе не открывают пункт — нужно явное право у профиля (кроме mixed через isAllowed). */
    const additionalSidebarAccess = (item: any) => {
      if (!item?.permission) return false;
      if (profile?.role === "owner") {
        return isAllowed(company, item.permission);
      }
      const userOk = hasPermission(item.permission) === true;
      const companyFlag = companyAllows(company, item.permission);
      const companyOk = companyFlag === true;
      const model = item.permissionModel || "mixed";
      if (model === "company") {
        return userOk && companyOk;
      }
      if (model === "user") {
        return userOk;
      }
      return isAllowed(company, item.permission);
    };

    const baseItems = MENU_CONFIG.additional.filter(additionalSidebarAccess);

    // Получаем динамические дополнительные услуги из конфигурации
    const dynamicServicesRaw = getAdditionalServicesForMenu({
      hasPermission,
      isAllowed: (perm) => isAllowed(company, perm),
      companyAllows: (perm) => companyAllows(company, perm),
      company,
      tariff,
      sector: company?.sector?.name,
      profile,
    });
    const dynamicServices = dynamicServicesRaw.map((service) => {
      if (service?.id && service?.to === "/crm/additional-services") {
        return {
          ...service,
          to: `/crm/additional-services?service=${service.id}`,
        };
      }
      return service;
    });

    const merged: any[] = [...baseItems];
    dynamicServices.forEach((service) => {
      const exists = merged.some((item: any) => item.to === service.to);
      if (!exists) {
        merged.push(service);
      }
    });

    return merged
      .filter((item: any) => item.implemented !== false)
      .filter(additionalSidebarAccess);
  }, [hasPermission, company, tariff, profile, isAllowed, companyAllows]);

  /**
   * Собирает финальный список меню
   */
  const menuItems = useMemo(() => {
    // Основные пункты меню
    const items: any[] = MENU_CONFIG.basic.filter(hasMenuAccess);

    const sectorItems = getSectorMenuItems();
    const additionalServices = getAdditionalServices();

    // Вставляем секторные пункты после "Обзор" (если он есть), иначе в начало
    if (sectorItems.length > 0) {
      const overviewIndex = items.findIndex((item: any) => item.label === "Обзор");
      if (overviewIndex !== -1) {
        items.splice(overviewIndex + 1, 0, ...sectorItems);
      } else {
        // Если "Обзор" не найден, добавляем секторные пункты в начало
        items.unshift(...sectorItems);
      }
    }

    // «Доп услуги»: один пункт с подменю (children), как раньше; без услуг — ссылка на хаб
    const settingsIndex = items.findIndex((item: any) => item.label === "Настройки");
    const passesHideRules = (entry) => {
      if (!entry?.implemented) return false;
      if (hiddenByRules.labels.has(entry.label)) return false;
      if (
        hiddenByRules.toIncludes.length > 0 &&
        typeof entry.to === "string" &&
        hiddenByRules.toIncludes.some((p: any) => entry.to.includes(p))
      ) {
        return false;
      }
      return true;
    };
    const additionalChildren = additionalServices.filter(passesHideRules);
    // Показываем «Доп услуги» только при наличии хотя бы одной услуги с доступом (не хаб «вслепую»)
    if (additionalChildren.length > 0) {
      const additionalServicesItem = {
        label: "Доп услуги",
        to: "/crm/additional-services",
        icon: menuIcons.clipboard,
        implemented: true,
        children: additionalChildren,
      };
      if (settingsIndex !== -1) {
        items.splice(settingsIndex, 0, additionalServicesItem);
      } else {
        items.push(additionalServicesItem);
      }
    }

    // Применяем правила скрытия
    const filteredItems = items.filter((item: any) => {
      if (!item.implemented) {
        return false;
      }

      // Скрываем "Филиалы" для пользователей-филиалов
      // Если у пользователя есть branch_ids, это означает, что он является филиалом
      if (item.label === "Филиалы") {
        if (isBranchBoundProfile(profile)) {
          return false;
        }
      }

      // Гибкие правила скрытия
      if (hiddenByRules.labels.has(item.label)) {
        return false;
      }
      if (
        hiddenByRules.toIncludes.length > 0 &&
        typeof item.to === "string" &&
        hiddenByRules.toIncludes.some((p: any) => item.to.includes(p))
      ) {
        return false;
      }

      return true;
    });

    return filteredItems;
  }, [
    hasMenuAccess,
    getSectorMenuItems,
    getAdditionalServices,
    hiddenByRules,
    profile,
  ]);

  return menuItems;
};
