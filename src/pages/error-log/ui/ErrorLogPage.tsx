import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, RefreshCw, Send } from "lucide-react";
import {
  PageShell,
  PageHeader,
  PagePanel,
  StatusChip,
  EmptyState,
} from "@shared/ui/page-shell";
import { Banner } from "@shared/ui/tools-kit";
import { BUSINESS_TIMEZONE, toBcp47 } from "@shared/config/locale";
import {
  formatErrorLogAsText,
  readErrorLog,
  subscribeErrorLog,
  type ErrorLogEntry,
  type ErrorLogLevel,
} from "@shared/lib/errorLog";
import { useUser } from "@entities/user";

const LEVEL_TONE: Record<ErrorLogLevel, "warning" | "danger" | "default"> = {
  warning: "warning",
  error: "danger",
  critical: "danger",
  deferred: "default",
};

const KNOWN_CODES = new Set([
  "network_lost",
  "network_restored",
  "printer_error",
  "subscription_expired",
  "subscription_expiring",
  "permission_denied",
  "drawer_pulse",
  "request_timeout",
  "server_error",
  "script_error",
  "render_crash",
  "sale_deferred",
]);

const triggerDownload = (file: File) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Журнал ошибок: только предупреждения и ошибки, включая разрывы связи. */
export default function ErrorLogPage() {
  const { t, i18n } = useTranslation();
  const { company, currentUser, profile } = useUser() as any;
  const [entries, setEntries] = useState<ErrorLogEntry[]>(() => readErrorLog());
  const [notice, setNotice] = useState<"downloaded" | "shared" | null>(null);

  const reload = useCallback(() => setEntries(readErrorLog()), []);
  useEffect(() => subscribeErrorLog(reload), [reload]);

  const bcp = toBcp47(i18n.language);
  const dateFmt = new Intl.DateTimeFormat(bcp, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUSINESS_TIMEZONE,
  });
  const timeFmt = new Intl.DateTimeFormat(bcp, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: BUSINESS_TIMEZONE,
  });

  const message = (e: ErrorLogEntry) =>
    e.code && KNOWN_CODES.has(String(e.code))
      ? t(`crm.tools.errorLog.messages.${e.code}.text`, { ...e.params, defaultValue: e.message })
      : e.message;
  const advice = (e: ErrorLogEntry) => {
    const key = `crm.tools.errorLog.messages.${e.code}.advice`;
    return e.code && KNOWN_CODES.has(String(e.code)) && i18n.exists(key)
      ? t(key, { ...e.params })
      : "";
  };

  /** Файл журнала с подписью: чей это журнал, чтобы поддержка сразу поняла. */
  const buildFile = () => {
    const login = profile?.email || currentUser?.email || profile?.username || currentUser?.username || "—";
    const header = {
      [t("crm.tools.errorLog.sign.company")]: company?.name || "—",
      [t("crm.tools.errorLog.sign.login")]: String(login),
      [t("crm.tools.errorLog.sign.program")]: t("crm.tools.errorLog.sign.programValue"),
      [t("crm.tools.errorLog.sign.version")]: __APP_VERSION__,
      [t("crm.tools.errorLog.sign.device")]: `${navigator.platform || "—"} · ${navigator.userAgent}`,
      [t("crm.tools.errorLog.sign.time")]: new Date().toISOString(),
    };
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    return new File([formatErrorLogAsText(entries, header)], `nurmarket-error-log-${stamp}.txt`, {
      type: "text/plain;charset=utf-8",
    });
  };

  const onDownload = () => {
    triggerDownload(buildFile());
    setNotice("downloaded");
  };

  const onSend = async () => {
    const file = buildFile();
    try {
      const nav: any = navigator;
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: t("crm.tools.errorLog.shareTitle") });
        setNotice("shared");
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    triggerDownload(file);
    setNotice("downloaded");
  };

  return (
    <PageShell>
      <PageHeader
        title={t("crm.tools.errorLog.pageTitle")}
        subtitle={t("crm.tools.errorLog.pageSubtitle")}
        actions={
          <>
            <button type="button" className="nur-btn nur-btn--secondary" onClick={reload}>
              <RefreshCw size={16} />
              <span className="nur-btn__label">{t("common.refresh")}</span>
            </button>
            <button type="button" className="nur-btn nur-btn--secondary" onClick={onDownload} disabled={entries.length === 0}>
              <Download size={16} />
              <span className="nur-btn__label">{t("crm.tools.errorLog.download")}</span>
            </button>
            <button type="button" className="nur-btn nur-btn--primary" onClick={() => void onSend()}>
              <Send size={16} />
              <span className="nur-btn__label">{t("crm.tools.errorLog.sendToSupport")}</span>
            </button>
          </>
        }
      />

      {notice && (
        <Banner tone="success">
          {t(notice === "shared" ? "crm.tools.errorLog.sharedHint" : "crm.tools.errorLog.manualSendHint")}
        </Banner>
      )}

      <PagePanel flush>
        {entries.length === 0 ? (
          <EmptyState
            title={t("crm.tools.errorLog.emptyTitle")}
            text={t("crm.tools.errorLog.emptyText")}
          />
        ) : (
          <div className="nur-table-wrap">
            <table className="nur-table nur-table--dense">
              <thead>
                <tr>
                  <th>{t("crm.tools.errorLog.cols.date")}</th>
                  <th>{t("crm.tools.errorLog.cols.time")}</th>
                  <th>{t("crm.tools.errorLog.cols.status")}</th>
                  <th>{t("crm.tools.errorLog.cols.note")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const hint = advice(e);
                  return (
                    <tr key={e.id}>
                      <td>{dateFmt.format(e.ts)}</td>
                      <td>{timeFmt.format(e.ts)}</td>
                      <td>
                        <StatusChip tone={LEVEL_TONE[e.level]}>
                          {t(`crm.tools.errorLog.levels.${e.level}`)}
                        </StatusChip>
                      </td>
                      <td title={e.message}>
                        <div>{message(e)}</div>
                        {hint && <div className="tk-muted">{hint}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PagePanel>
      <p className="tk-muted">{t("crm.tools.errorLog.footnote")}</p>
    </PageShell>
  );
}
