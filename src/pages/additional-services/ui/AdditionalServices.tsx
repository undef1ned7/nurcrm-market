import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
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
  const { t } = useTranslation();
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
    const showPrice = Boolean(social.price);
    return (
      <article key={social.id} className="additional-services__card">
        {showPrice ? (
          <span className="additional-services__card-price">
            {t("crm.additionalServices.pricePerMonth", { price: social.price })}
          </span>
        ) : null}
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
              {t("crm.additionalServices.goTo")}
            </button>
          ) : null}
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => handleSocialClick(social.id)}
          >
            {t("crm.additionalServices.connect")}
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
          title={t("crm.additionalServices.noServicesTitle")}
          text={t("crm.additionalServices.noServicesText")}
        />
      )}
    </section>
  );

  return (
    <PageShell className="additional-services">
      <PageHeader
        title={t("crm.additionalServices.pageTitle")}
        subtitle={t("crm.additionalServices.subtitle")}
      />

      <PagePanel>
        {renderSection(t("crm.additionalServices.integrations"), integrations)}
        {renderSection(t("crm.additionalServices.extensions"), extensions)}

        <p className="additional-services__message">
          {t("crm.additionalServices.extensionHint")}
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
