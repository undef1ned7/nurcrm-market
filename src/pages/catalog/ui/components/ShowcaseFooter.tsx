import { useTranslation } from "react-i18next";
import {
  FaInstagram,
  FaTelegramPlane,
  FaWhatsapp,
  FaTiktok,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaClock,
} from "react-icons/fa";
import { socialUrl, tx, type ShowcaseDesign } from "../../model/showcaseDesign";

const SOCIAL_ICONS: Record<string, JSX.Element> = {
  instagram: <FaInstagram />,
  telegram: <FaTelegramPlane />,
  whatsapp: <FaWhatsapp />,
  tiktok: <FaTiktok />,
};

const SOCIAL_NAMES: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
};

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Адрес, телефоны, часы, карта, соцсети — общие для подвала и блока «Контакты». */
function ContactsBody({ design }: { design: ShowcaseDesign }) {
  const { t } = useTranslation();
  const f = design.footer;
  const address = tx(f.address, design.lang);
  const hours = tx(f.hours, design.lang);
  const socials = Object.entries(f.socials)
    .map(([net, val]) => ({ net, url: socialUrl(net, val) }))
    .filter((s): s is { net: string; url: string } => !!s.url);

  return (
    <div className="sfcontacts__grid">
      {(address || f.map_url) && (
        <div className="sfcontacts__item">
          <div className="sfcontacts__label">
            <FaMapMarkerAlt aria-hidden="true" /> {t("catalog.footer.address")}
          </div>
          {address && <div className="sfcontacts__value">{address}</div>}
          {f.map_url && (
            <a className="sfcontacts__link" href={f.map_url} target="_blank" rel="noopener noreferrer">
              {t("catalog.footer.map")}
            </a>
          )}
        </div>
      )}
      {f.phones.length > 0 && (
        <div className="sfcontacts__item">
          <div className="sfcontacts__label">
            <FaPhoneAlt aria-hidden="true" /> {t("catalog.footer.phones")}
          </div>
          {f.phones.map((p) => (
            <a key={p} className="sfcontacts__link" href={telHref(p)}>
              {p}
            </a>
          ))}
        </div>
      )}
      {hours && (
        <div className="sfcontacts__item">
          <div className="sfcontacts__label">
            <FaClock aria-hidden="true" /> {t("catalog.footer.hours")}
          </div>
          <div className="sfcontacts__value">{hours}</div>
        </div>
      )}
      {socials.length > 0 && (
        <div className="sfcontacts__item">
          <div className="sfcontacts__socials">
            {socials.map((s) => (
              <a
                key={s.net}
                className="sfcontacts__social"
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL_NAMES[s.net] || s.net}
                title={SOCIAL_NAMES[s.net] || s.net}
              >
                {SOCIAL_ICONS[s.net] || s.net}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const hasContacts = (design: ShowcaseDesign) => {
  const f = design.footer;
  return !!(
    tx(f.address, design.lang) ||
    tx(f.hours, design.lang) ||
    f.phones.length ||
    f.map_url ||
    Object.keys(f.socials).length
  );
};

export function ShowcaseFooter({ design }: { design: ShowcaseDesign | null }) {
  if (!design || !design.footer.enabled) return null;
  const copyright = tx(design.footer.copyright, design.lang);
  if (!hasContacts(design) && !copyright) return null;

  return (
    <footer className="sffooter" role="contentinfo">
      <div className="sffooter__inner">
        {hasContacts(design) && <ContactsBody design={design} />}
        {copyright && <div className="sffooter__copy">{copyright}</div>}
      </div>
    </footer>
  );
}

/** Блок «Контакты» внутри страницы (берёт данные из `footer`). */
export function ShowcaseContacts({ design, title }: { design: ShowcaseDesign; title: string }) {
  const { t } = useTranslation();
  if (!hasContacts(design)) return null;
  return (
    <section className="sfcontacts">
      <h2 className="sfsection__title">{title || t("catalog.footer.contacts")}</h2>
      <ContactsBody design={design} />
    </section>
  );
}
