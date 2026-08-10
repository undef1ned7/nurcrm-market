import { useEffect, useState, useMemo } from "react";
import { FaCheckCircle, FaRegCircle, FaSearch, FaTimes } from "react-icons/fa";
import { MENU_CONFIG } from "@widgets/sidebar/ui/config/menuConfig";
import { HIDE_RULES } from "@widgets/sidebar/ui/config/hideRules";
import {
  getAdditionalServicesForMenu,
  ADDITIONAL_SERVICES_CONFIG,
} from "@widgets/sidebar/ui/config/additionalServicesConfig";
import "./AccessList.scss";
import {
  BASIC_ACCESS_TYPES,
  SECTOR_ACCESS_TYPES,
  ALL_ACCESS_TYPES,
  getAllAccessTypes,
  additionalServicesMapping,
  MARKET_CASHIER_SPECIAL_KEYS,
  CAFE_WAITER_ORDER_SPECIAL_KEYS,
} from "./accessList/accessList.constants";
import { AccessSection } from "./accessList/components/AccessSection";

const AccessList = ({
  employeeAccesses,
  onSaveAccesses,
  role,
  sectorName,
  profile,
  tariff,
  company, // Добавляем company для использования в логике меню
  isModalMode = false, // Новый проп для режима модального окна
}: any) => {
  const [isOpen, setIsOpen] = useState(isModalMode); // В модальном режиме сразу открыт
  const [searchQuery, setSearchQuery] = useState("");

  // Получаем доступы, которые реально показываются в сайдбаре
  const sidebarAccessTypes = useMemo(() => {
    // Определяем функции проверки прав до использования
    const companyAllows = (perm) => {
      if (!company) return undefined;
      if (Object.prototype.hasOwnProperty.call(company, perm)) {
        return company[perm] === true;
      }
      return undefined;
    };

    // Вычисляем скрытые элементы на основе правил (как в useMenuItems)
    const hiddenByRules = (() => {
      const result: any = { labels: new Set(), toIncludes: [] as any[] };

      HIDE_RULES.forEach((rule: any) => {
        const when: any = rule?.when || {};
        const hide: any = rule?.hide || {};
        const sectorOk = !when.sector || when.sector === sectorName;
        const tariffOk = !when.tariff || when.tariff === tariff;
        const tariffInOk =
          !when.tariffIn || (tariff && when.tariffIn.includes(tariff));
        const tariffNotInOk =
          !when.tariffNotIn || (tariff && !when.tariffNotIn.includes(tariff));

        if (sectorOk && tariffOk && tariffInOk && tariffNotInOk) {
          (hide.labels || []).forEach((l) => result.labels.add(l));
          (hide.toIncludes || []).forEach((p) => result.toIncludes.push(p));
        }
      });

      return result;
    })();

    // Получаем базовые пункты меню
    const basicItems = MENU_CONFIG.basic.filter((item: any) => {
      if (!item.implemented) return false;
      if (hiddenByRules.labels.has(item.label)) return false;
      if (
        hiddenByRules.toIncludes.length > 0 &&
        typeof item.to === "string" &&
        hiddenByRules.toIncludes.some((p: any) => item.to.includes(p))
      ) {
        return false;
      }
      return true;
    });

    // Получаем секторные пункты меню
    let sectorItems: any[] = [];
    if (sectorName && company?.sector?.name && tariff !== "Старт") {
      const sectorNameLower = company.sector.name.toLowerCase();
      const sectorKey = sectorNameLower.replace(/\s+/g, "_");

      const sectorMapping = {
        строительная_компания: "building",
        ремонтные_и_отделочные_работы: "building",
        архитектура_и_дизайн: "building",
        барбершоп: "barber",
        гостиница: "hostel",
        школа: "school",
        магазин: "market",
        маркет: "market",
        кафе: "cafe",
        "Цветочный магазин": "market",
        производство: "production",
        консалтинг: "consulting",
        склад: "warehouse",
        пилорама: "pilorama",
        логистика: "logistics",
      };

      const configKey = sectorMapping[sectorKey as any] || sectorKey;
      const sectorConfig = MENU_CONFIG.sector[configKey as any] || [];

      sectorItems = sectorConfig.filter((item: any) => {
        if (!item.implemented) return false;
        if (hiddenByRules.labels.has(item.label)) return false;
        if (
          hiddenByRules.toIncludes.length > 0 &&
          typeof item.to === "string" &&
          hiddenByRules.toIncludes.some((p: any) => item.to.includes(p))
        ) {
          return false;
        }
        return true;
      });
    }

    // Собираем все permissions из меню
    const allMenuPermissions = new Set();
    [...basicItems, ...sectorItems].forEach((item) => {
      if (item.permission) {
        // "Филиалы" должны добавляться только если у компании есть активная доп. услуга
        if (item.permission === "can_view_branch") {
          if (companyAllows("can_view_branch") === true) {
            allMenuPermissions.add(item.permission);
          }
        } else {
          allMenuPermissions.add(item.permission);
        }
      }
      // Обрабатываем children для дополнительных услуг
      if (item.children && Array.isArray(item.children)) {
        item.children.forEach((child: any) => {
          if (child.permission) {
            // "Филиалы" должны добавляться только если у компании есть активная доп. услуга
            if (child.permission === "can_view_branch") {
              if (companyAllows("can_view_branch") === true) {
                allMenuPermissions.add(child.permission);
              }
            } else {
              allMenuPermissions.add(child.permission);
            }
          }
        });
      }
    });

    // Для сектора "Магазин" явно добавляем permission интерфейса кассира,
    // так как он может не иметь собственного пункта меню, но должен отображаться в списке доступов
    if (sectorName) {
      const sectorNameLower = sectorName.toLowerCase().trim();
      if (
        sectorNameLower === "магазин" ||
        sectorNameLower === "маркет" ||
        sectorNameLower === "цветочный магазин" ||
        sectorNameLower.includes("магазин")
      ) {
        allMenuPermissions.add("can_view_cashier");
        // Эти права не всегда присутствуют как отдельные menu items,
        // но должны быть доступны в "Управление доступами" для Маркета.
        allMenuPermissions.add("can_view_market_discount");
        allMenuPermissions.add("can_view_market_edit_price");
        allMenuPermissions.add("can_view_market_delete_cart_item");
        allMenuPermissions.add("can_view_market_employee_return");
        allMenuPermissions.add("can_view_market_procurement");
        allMenuPermissions.add("can_view_market_supplier");
      } else if (String(sectorName || "").trim() === "Кафе") {
        allMenuPermissions.add("can_view_cafe_order_pay");
        allMenuPermissions.add("can_view_cafe_order_return");
      } else if (String(sectorName || "").trim() === "Консалтинг") {
        allMenuPermissions.add("can_manage_funnel_leads");
        allMenuPermissions.add("can_manage_funnel_stages");
      }
    }

    // Добавляем активные доп. услуги компании и профиля владельца
    const profileAllows = (perm) => {
      if (!profile) return undefined;
      if (Object.prototype.hasOwnProperty.call(profile, perm)) {
        return profile[perm] === true;
      }
      return undefined;
    };

    if (company || profile) {
      // Проверяем базовые доп. услуги из MENU_CONFIG.additional
      MENU_CONFIG.additional.forEach((service) => {
        if (!service.permission) return;

        // Для WhatsApp, Instagram, Telegram, Документы проверяем ТОЛЬКО права компании
        if (
          service.permission === "can_view_whatsapp" ||
          service.permission === "can_view_instagram" ||
          service.permission === "can_view_telegram" ||
          service.permission === "can_view_documents"
        ) {
          if (companyAllows(service.permission) === true) {
            allMenuPermissions.add(service.permission);
          }
        }
        // Для "Печать штрих-кодов" и "Интеграция с весами" проверяем ТОЛЬКО права профиля владельца
        else if (
          service.permission === "can_view_market_label" ||
          service.permission === "can_view_market_scales"
        ) {
          // Проверяем права в профиле владельца
          if (profileAllows(service.permission) === true) {
            allMenuPermissions.add(service.permission);
          }
        }
        // Для остальных проверяем права компании или профиля
        else {
          if (
            companyAllows(service.permission) === true ||
            profileAllows(service.permission) === true
          ) {
            allMenuPermissions.add(service.permission);
          }
        }
      });

      // Проверяем динамические доп. услуги из additionalServicesConfig
      const hasPermission = (perm) => {
        // Проверяем и в компании, и в профиле
        return companyAllows(perm) === true || profileAllows(perm) === true;
      };

      const isAllowed = (comp, perm) => {
        // Проверяем и в компании, и в профиле
        return companyAllows(perm) === true || profileAllows(perm) === true;
      };

      const dynamicServices = getAdditionalServicesForMenu({
        hasPermission,
        isAllowed,
        company,
        tariff,
        sector: company?.sector?.name || sectorName,
      });

      dynamicServices.forEach((service) => {
        if (service.permission) {
          // "Филиалы" должны добавляться только если у компании есть активная доп. услуга
          if (service.permission === "can_view_branch") {
            if (companyAllows("can_view_branch") === true) {
              allMenuPermissions.add(service.permission);
            }
          } else {
            allMenuPermissions.add(service.permission);
          }
        }
      });
    }

    // Маппим permissions обратно в доступы из BASIC_ACCESS_TYPES и SECTOR_ACCESS_TYPES
    const result: any[] = [];
    const normalizedSectorName =
      sectorName === "Услуги" || sectorName === "Стоматология"
        ? "Барбершоп"
        : sectorName;
    const sectorAccessList = SECTOR_ACCESS_TYPES[normalizedSectorName] || [];
    const sectorBackendKeys = new Set(
      sectorAccessList.map((accessType) => accessType.backendKey),
    );

    // Базовые доступы (секторные ключи пропускаем — у них свои подписи)
    BASIC_ACCESS_TYPES.forEach((accessType) => {
      if (sectorBackendKeys.has(accessType.backendKey)) return;
      // "Филиалы" должны отображаться только если у компании есть активная доп. услуга
      if (accessType.backendKey === "can_view_branch") {
        // Проверяем, есть ли активная доп. услуга у компании
        if (
          companyAllows("can_view_branch") === true &&
          allMenuPermissions.has(accessType.backendKey)
        ) {
          result.push(accessType);
        }
      } else if (allMenuPermissions.has(accessType.backendKey)) {
        result.push(accessType);
      }
    });

    // Секторные доступы
    sectorAccessList.forEach((accessType) => {
      if (
        allMenuPermissions.has(accessType.backendKey) &&
        !result.some((r: any) => r.backendKey === accessType.backendKey)
      ) {
        result.push(accessType);
      }
    });

    // Добавляем доп. услуги, которые активны у компании или профиля, но еще не добавлены
    allMenuPermissions.forEach((permission: any) => {
      // Проверяем, что это доп. услуга и её еще нет в результате
      if (additionalServicesMapping[permission as any]) {
        const exists = result.some((r: any) => r.backendKey === permission);
        if (!exists) {
          result.push(additionalServicesMapping[permission as any]);
        }
      } else {
        // Проверяем динамические доп. услуги из конфигурации
        // Если permission есть в allMenuPermissions, но нет в маппинге,
        // это может быть динамическая услуга (например, "Склад", "Филиалы")
        let dynamicService: any = MENU_CONFIG.additional.find(
          (s: any) => s.permission === permission,
        );
        if (!dynamicService) {
          dynamicService = ADDITIONAL_SERVICES_CONFIG.find(
            (s: any) => s.permission === permission,
          );
        }
        if (
          dynamicService &&
          !result.some((r: any) => r.backendKey === permission)
        ) {
          result.push({
            value: dynamicService.label,
            label: dynamicService.label,
            backendKey: dynamicService.permission,
          });
        }
      }
    });

    return result;
  }, [sectorName, tariff, company, profile]);

  const [selectedAccess, setSelectedAccess] = useState(() => {
    // Используем доступы из сайдбара
    const availableAccessTypes = sidebarAccessTypes;

    const initialAccess: any = {};
    availableAccessTypes.forEach((accessType) => {
      initialAccess[accessType.backendKey] = employeeAccesses?.includes(
        accessType.value,
      );
    });

    return initialAccess;
  });

  useEffect(() => {
    // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedAccess));
  }, [selectedAccess]);

  useEffect(() => {
    // Используем доступы из сайдбара
    const availableAccessTypes = sidebarAccessTypes;

    const newAccessState: any = {};
    availableAccessTypes.forEach((accessType) => {
      newAccessState[accessType.backendKey] = employeeAccesses?.includes(
        accessType.value,
      );
    });
    setSelectedAccess(newAccessState);
  }, [employeeAccesses, sidebarAccessTypes]);

  const toggleAccess = (backendKey) => {
    setSelectedAccess((prev) => ({
      ...prev,
      [backendKey]: !prev[backendKey],
    }));
  };

  // Используем доступы из сайдбара
  const availableAccessTypes = sidebarAccessTypes;

  // Разделяем на базовые, секторные и доп. услуги
  const basicAccessTypes = useMemo(() => {
    return availableAccessTypes.filter((type) =>
      BASIC_ACCESS_TYPES.some((basic) => basic.backendKey === type.backendKey),
    );
  }, [availableAccessTypes]);

  const sectorAccessTypes = useMemo(() => {
    return availableAccessTypes.filter(
      (type) =>
        !BASIC_ACCESS_TYPES.some(
          (basic) => basic.backendKey === type.backendKey,
        ) &&
        !additionalServicesMapping[type.backendKey] &&
        !MARKET_CASHIER_SPECIAL_KEYS.has(type.backendKey) &&
        !CAFE_WAITER_ORDER_SPECIAL_KEYS.has(type.backendKey),
    );
  }, [availableAccessTypes]);

  const marketCashierSpecialTypes = useMemo(() => {
    return availableAccessTypes.filter((type) =>
      MARKET_CASHIER_SPECIAL_KEYS.has(type.backendKey),
    );
  }, [availableAccessTypes]);

  const cafeWaiterOrderSpecialTypes = useMemo(() => {
    return availableAccessTypes.filter((type) =>
      CAFE_WAITER_ORDER_SPECIAL_KEYS.has(type.backendKey),
    );
  }, [availableAccessTypes]);

  // Доп. услуги (отдельная категория)
  const additionalServicesTypes = useMemo(() => {
    // Для строительных секторов доп. услуги скрываем полностью
    const sectorLower = (sectorName || "").toLowerCase();
    if (
      sectorLower.includes("строительная") ||
      sectorLower.includes("ремонтные") ||
      sectorLower.includes("архитектура")
    ) {
      return [];
    }

    return availableAccessTypes.filter((type) => {
      // Проверяем, есть ли это в маппинге базовых доп. услуг
      if (additionalServicesMapping[type.backendKey]) {
        return true;
      }
      // Проверяем, есть ли это в MENU_CONFIG.additional
      const inMenuConfig = MENU_CONFIG.additional.some(
        (s) => s.permission === type.backendKey,
      );
      if (inMenuConfig) {
        return true;
      }
      // Проверяем, есть ли это в динамических услугах
      const inDynamicServices = ADDITIONAL_SERVICES_CONFIG.some(
        (s) => s.permission === type.backendKey,
      );
      return inDynamicServices;
    });
  }, [availableAccessTypes, sectorName]);

  // Фильтрация по поисковому запросу
  const filteredBasic = useMemo(() => {
    if (!searchQuery.trim()) return basicAccessTypes;
    const query = searchQuery.toLowerCase();
    return basicAccessTypes.filter((type) =>
      type.label.toLowerCase().includes(query),
    );
  }, [basicAccessTypes, searchQuery]);

  const filteredSector = useMemo(() => {
    if (!searchQuery.trim()) return sectorAccessTypes;
    const query = searchQuery.toLowerCase();
    return sectorAccessTypes.filter((type) =>
      type.label.toLowerCase().includes(query),
    );
  }, [sectorAccessTypes, searchQuery]);

  const filteredAdditional = useMemo(() => {
    if (!searchQuery.trim()) return additionalServicesTypes;
    const query = searchQuery.toLowerCase();
    return additionalServicesTypes.filter((type) =>
      type.label.toLowerCase().includes(query),
    );
  }, [additionalServicesTypes, searchQuery]);

  const filteredMarketCashierSpecial = useMemo(() => {
    if (!searchQuery.trim()) return marketCashierSpecialTypes;
    const query = searchQuery.toLowerCase();
    return marketCashierSpecialTypes.filter((type) =>
      type.label.toLowerCase().includes(query),
    );
  }, [marketCashierSpecialTypes, searchQuery]);

  const filteredCafeWaiterOrderSpecial = useMemo(() => {
    if (!searchQuery.trim()) return cafeWaiterOrderSpecialTypes;
    const query = searchQuery.toLowerCase();
    return cafeWaiterOrderSpecialTypes.filter((type) =>
      type.label.toLowerCase().includes(query),
    );
  }, [cafeWaiterOrderSpecialTypes, searchQuery]);

  const handleSave = () => {
    const payloadForBackend: any = {};
    // Сохраняем только те доступы, которые есть в сайдбаре
    sidebarAccessTypes.forEach((accessType) => {
      payloadForBackend[accessType.backendKey] =
        !!selectedAccess[accessType.backendKey];
    });

    onSaveAccesses(payloadForBackend);
    if (!isModalMode) {
      setIsOpen(false);
    }
  };

  const handleSelectAll = (types, select = true) => {
    const newAccess = { ...selectedAccess };
    types.forEach((type) => {
      newAccess[type.backendKey] = select;
    });
    setSelectedAccess(newAccess);
  };

  // Если режим модального окна, рендерим полную версию
  if (isModalMode) {
    return (
      <div className="access-list-modal">
        <div className="access-list-modal__search">
          <FaSearch className="access-list-modal__search-icon" />
          <input
            type="text"
            className="access-list-modal__search-input"
            placeholder="Поиск доступов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="access-list-modal__search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Очистить поиск"
            >
              <FaTimes size={14} />
            </button>
          ) : null}
        </div>

        <AccessSection
          title="Базовые доступы"
          items={filteredBasic}
          selectedAccess={selectedAccess}
          onToggle={toggleAccess}
          onSelectAll={handleSelectAll}
          tone="success"
          gridTone="success"
        />

        <AccessSection
          title="Секторные доступы"
          items={filteredSector}
          selectedAccess={selectedAccess}
          onToggle={toggleAccess}
          onSelectAll={handleSelectAll}
          tone="info"
          gridTone="info"
        />

        <AccessSection
          title="Заказы кафе — официанты"
          items={filteredCafeWaiterOrderSpecial}
          selectedAccess={selectedAccess}
          onToggle={toggleAccess}
          onSelectAll={handleSelectAll}
          tone="info"
          gridTone="info"
        />

        <AccessSection
          title="Касса Маркета"
          items={filteredMarketCashierSpecial}
          selectedAccess={selectedAccess}
          onToggle={toggleAccess}
          onSelectAll={handleSelectAll}
          tone="warning"
          gridTone="warning"
        />

        <AccessSection
          title="Дополнительные услуги"
          items={filteredAdditional}
          selectedAccess={selectedAccess}
          onToggle={toggleAccess}
          onSelectAll={handleSelectAll}
          tone="warning"
          gridTone="warning"
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid var(--nur-border)",
          }}
        >
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={handleSave}
          >
            Сохранить доступы
          </button>
        </div>
      </div>
    );
  }

  // Старый режим (для использования в таблице)
  return (
    <div className={"accessList"} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={role === "owner"}
        className={"accessButton"}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        Доступы сотрудника ▾
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            width: "100%",
            background: "var(--nur-surface)",
            border: "1px solid var(--nur-border)",
            borderRadius: "6px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            zIndex: 10,
            padding: "8px",
            maxHeight: 150,
            overflow: "auto",
          }}
        >
          {(sectorName ? getAllAccessTypes(sectorName) : ALL_ACCESS_TYPES).map(
            (accessType) => (
              <div
                key={accessType.backendKey}
                onClick={() => toggleAccess(accessType.backendKey)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: "var(--nur-text)" }}>{accessType.label}</span>
                {selectedAccess[accessType.backendKey] ? (
                  <FaCheckCircle color="#2ecc71" />
                ) : (
                  <FaRegCircle color="#ccc" />
                )}
              </div>
            ),
          )}

          <button
            onClick={handleSave}
            className={"saveButton"}
            style={{
              marginTop: "10px",
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "var(--nur-info)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Сохранить доступы
          </button>
        </div>
      )}
    </div>
  );
};

export default AccessList;
