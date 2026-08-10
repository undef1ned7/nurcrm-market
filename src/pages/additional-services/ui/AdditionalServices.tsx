import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import SocialModal from "./SocialModal";
import "./AdditionalServices.scss";
import { useMenuPermissions } from "@widgets/sidebar/ui/hooks/useMenuPermissions";
import { getAdditionalServicesForPage } from "@widgets/sidebar/ui/config/additionalServicesConfig";
import {
  PageShell,
  PageHeader,
  PagePanel,
  EmptyState,
} from "@shared/ui/page-shell";

const AdditionalServices = () => {
  const navigate = useNavigate();
  const [selectedSocial, setSelectedSocial] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { company, tariff, sector, profile } = useSelector(
    (state: any) => state.user,
  );
  const { hasPermission, isAllowed } = useMenuPermissions();
  const handleSocialClick = (social) => {
    // Все доп.услуги (включая печать штрих-кодов) запрашиваются через модалку
    setSelectedSocial(social);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSocial(null);
  };

  const socialNetworks = useMemo(
    () =>
      getAdditionalServicesForPage({
        hasPermission,
        isAllowed,
        company,
        tariff: tariff || company?.subscription_plan?.name || "Старт",
        sector: sector || company?.sector?.name,
        profile,
      }),
    [hasPermission, isAllowed, company, tariff, sector, profile],
  );
  const integrations = useMemo(
    () => socialNetworks.filter((item) => item.type === "navigational"),
    [socialNetworks],
  );
  const extensions = useMemo(
    () => socialNetworks.filter((item) => item.type === "extension"),
    [socialNetworks],
  );

  const renderServiceCard = (social) => {
    const IconComponent = social.icon;
    const canNavigate =
      social.type === "navigational" &&
      social.isConnected &&
      Boolean(social.to);
    return (
      <article key={social.id} className="additional-services__card">
        <div className="additional-services__card-icon">
          {IconComponent ? <IconComponent /> : null}
        </div>
        <h3 className="additional-services__card-title">{social.title}</h3>
        <p className="additional-services__card-description">
          {social.description}
        </p>
        <div className="additional-services__card-actions">
          {canNavigate ? (
            <button
              type="button"
              className="nur-btn nur-btn--primary nur-btn--sm"
              onClick={() => navigate(social.to)}
            >
              Перейти
            </button>
          ) : null}
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => handleSocialClick(social.id)}
          >
            Подключить
          </button>
        </div>
      </article>
    );
  };

  const renderSection = (title, items) => (
    <section className="additional-services__section">
      <h2 className="additional-services__section-title">{title}</h2>
      {items.length ? (
        <div className="additional-services__grid">
          {items.map(renderServiceCard)}
        </div>
      ) : (
        <EmptyState
          title="Пока нет услуг"
          text="В этом разделе пока нет доступных услуг."
        />
      )}
    </section>
  );

  return (
    <PageShell className="additional-services">
      <PageHeader
        title="Дополнительные услуги"
        subtitle="Расширьте возможности CRM — подключите интеграции и расширения."
      />

      <PagePanel>
        {renderSection("Интеграции", integrations)}
        {renderSection("Расширения", extensions)}

        <p className="additional-services__message">
          Мы свяжемся с вами в ближайшее время для обсуждения деталей
          подключения.
        </p>
      </PagePanel>

      <SocialModal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedSocial={selectedSocial}
      />
    </PageShell>
  );
};

export default AdditionalServices;
