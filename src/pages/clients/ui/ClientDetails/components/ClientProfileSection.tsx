import {
  Phone,
  Mail,
  User as UserIcon,
  IdCard,
  CalendarDays,
  ReceiptText,
} from "lucide-react";

import { useTranslation } from "react-i18next";

import { toIsoDate10 } from "../clientDetails.helpers";
import type { ClientRecord } from "../clientDetails.types";

export interface ProfileSnapshotItem {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}

export interface RequisiteItem {
  label: string;
  value?: string;
  full?: boolean;
}

export interface ClientProfileSectionProps {
  client: ClientRecord | null;
  clientName: string;
  clientInitials: string;
  statusText: string;
  clientTypeLabel: string;
  profileSnapshot: ProfileSnapshotItem[];
  requisites: RequisiteItem[];
}

export function ClientProfileSection({
  client,
  clientName,
  clientInitials,
  statusText,
  clientTypeLabel,
  profileSnapshot,
  requisites,
}: ClientProfileSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="cdx__grid">
      <div className="cdx__card">
        <div className="cdx__card-head">
          <h2 className="cdx__card-title">
            <UserIcon /> {t("crm.clients.details.clientInfo")}
          </h2>
        </div>
        <div className="cdx__card-body cdx__card-body--profile">
          <div className="cdx__profile">
            <div className="cdx__profile-avatar" aria-hidden="true">
              {clientInitials}
            </div>
            <div className="cdx__profile-info">
              <div className="cdx__profile-name">{clientName}</div>
              <div className="cdx__profile-badges">
                <span className="cdx__badge cdx__badge--status">
                  {statusText}
                </span>
                <span className="cdx__badge cdx__badge--type">
                  {clientTypeLabel}
                </span>
              </div>
              {client?.address ? (
                <div className="cdx__profile-meta" title={client.address}>
                  {client.address}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="cdx__profile-snapshot"
            aria-label={t("crm.clients.details.clientSummary")}
          >
            {profileSnapshot.map((item) => (
              <div key={item.label} className="cdx__profile-snapshot-item">
                <div className="cdx__profile-snapshot-label">{item.label}</div>
                <div className="cdx__profile-snapshot-value">
                  {item.value}
                  {item.unit ? <span>{item.unit}</span> : null}
                </div>
                <div className="cdx__profile-snapshot-hint">{item.hint}</div>
              </div>
            ))}
          </div>

          <div className="cdx__contacts">
            <div className="cdx__contact">
              <span className="cdx__contact-ico">
                <Phone />
              </span>
              <div className="cdx__contact-body">
                <div className="cdx__contact-label">{t("common.phone")}</div>
                <div className="cdx__contact-value">
                  {client?.phone ? (
                    <a href={`tel:${String(client.phone).replace(/\D/g, "")}`}>
                      {client.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>

            <div className="cdx__contact">
              <span className="cdx__contact-ico">
                <Mail />
              </span>
              <div className="cdx__contact-body">
                <div className="cdx__contact-label">Email</div>
                <div className="cdx__contact-value">
                  {client?.email || "—"}
                </div>
              </div>
            </div>

            <div className="cdx__contact">
              <span className="cdx__contact-ico">
                <IdCard />
              </span>
              <div className="cdx__contact-body">
                <div className="cdx__contact-label">
                  {t("crm.clients.details.clientType")}
                </div>
                <div className="cdx__contact-value">{clientTypeLabel}</div>
              </div>
            </div>

            <div className="cdx__contact">
              <span className="cdx__contact-ico">
                <CalendarDays />
              </span>
              <div className="cdx__contact-body">
                <div className="cdx__contact-label">
                  {t("crm.clients.details.registrationDate")}
                </div>
                <div className="cdx__contact-value">
                  {toIsoDate10(client?.date) || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cdx__card">
        <div className="cdx__card-head">
          <h2 className="cdx__card-title">
            <ReceiptText /> {t("crm.clients.details.requisitesTitle")}
          </h2>
        </div>
        <div className="cdx__card-body">
          <div className="cdx__req-grid">
            {requisites.map((r) => (
              <div
                key={r.label}
                className={`cdx__req-item${
                  r.full ? " cdx__req-item--full" : ""
                }`}
              >
                <div className="cdx__req-label">{r.label}</div>
                <div className="cdx__req-value">{r.value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
