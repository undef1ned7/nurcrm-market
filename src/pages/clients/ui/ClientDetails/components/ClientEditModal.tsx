import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserCog, X, Trash2 } from "lucide-react";
import { msgFromError, toIsoDate10 } from "../clientDetails.helpers";
import api from "@shared/api";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import "../ClientModals.scss";
import ClientModalPortal from "./ClientModalPortal";

export default function ClientEditModal({
  open,
  client,
  onClose,
  onUpdated,
  onDeleted,
}: any) {
  const { mode } = useContext(ThemeModeContext);
  const { t } = useTranslation();
  const [editFio, setEditFio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLlc, setEditLlc] = useState("");
  const [editInn, setEditInn] = useState("");
  const [editOkpo, setEditOkpo] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editBik, setEditBik] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [saveClientErr, setSaveClientErr] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  // Удаление уже идёт — повторное «Подтвердить» (тройной клик/Enter) игнорируется
  const deletingRef = useRef(false);
  const [confirmDialog, setConfirmDialog] = useState<any>({
    open: false,
    message: "",
    onConfirm: null,
  });

  useEffect(() => {
    if (!open || !client) return;
    setEditFio(client?.fio || client?.full_name || "");
    setEditPhone(client?.phone || "");
    setEditEmail(client?.email || "");
    setEditDate(toIsoDate10(client?.date) || "");
    setEditStatus(client?.status || "");
    setEditLlc(client?.llc || "");
    setEditInn(client?.inn || "");
    setEditOkpo(client?.okpo || "");
    setEditScore(client?.score || "");
    setEditBik(client?.bik || "");
    setEditAddress(client?.address || "");
    setSaveClientErr("");
  }, [open, client]);

  if (!open || !client) return null;

  const requiredOk =
    String(editFio).trim().length > 0 && String(editPhone).trim().length > 0;

  const updateClientApi = async (
    clientId,
    {
      full_name,
      phone,
      email,
      date,
      status,
      llc,
      inn,
      okpo,
      score,
      bik,
      address,
    },
  ) => {
    const payload = {
      full_name: String(full_name || "").trim(),
      phone: String(phone || "").trim(),
      email: String(email || "").trim(),
      date: date ? toIsoDate10(date) : "",
      status: String(status || "").trim(),
      llc: String(llc || "").trim(),
      inn: String(inn || "").trim(),
      okpo: String(okpo || "").trim(),
      score: String(score || "").trim(),
      bik: String(bik || "").trim(),
      address: String(address || "").trim(),
    };
    const res = await api.put(`/main/clients/${clientId}/`, payload);
    return res?.data || payload;
  };

  const deleteClientApi = async (clientId) => {
    await api.delete(`/main/clients/${clientId}/`);
  };

  const handleSave = async () => {
    if (!client?.id) return;
    if (!requiredOk) {
      setSaveClientErr(t("crm.clients.details.fillRequired"));
      return;
    }
    try {
      setSavingClient(true);
      setSaveClientErr("");
      const updated = await updateClientApi(client.id, {
        full_name: editFio,
        phone: editPhone,
        email: editEmail,
        date: editDate,
        status: editStatus,
        llc: editLlc,
        inn: editInn,
        okpo: editOkpo,
        score: editScore,
        bik: editBik,
        address: editAddress,
      });

      onUpdated?.({
        ...client,
        ...updated,
        fio: updated.full_name || editFio,
        full_name: updated.full_name || editFio,
        phone: updated.phone || editPhone,
        email: updated.email ?? editEmail,
        date: toIsoDate10(updated.date || editDate),
        status: updated.status ?? editStatus,
        llc: updated.llc ?? editLlc,
        inn: updated.inn ?? editInn,
        okpo: updated.okpo ?? editOkpo,
        score: updated.score ?? editScore,
        bik: updated.bik ?? editBik,
        address: updated.address ?? editAddress,
      });

      onClose?.();
    } catch (e: any) {
      console.error(e);
      setSaveClientErr(
        msgFromError(e, t("crm.clients.details.saveClientError")),
      );
    } finally {
      setSavingClient(false);
    }
  };

  const handleDelete = () => {
    if (!client?.id) return;
    setConfirmDialog({
      open: true,
      message: t("crm.clients.details.deleteClientConfirm"),
      onConfirm: async () => {
        if (deletingRef.current) return;
        deletingRef.current = true;
        // Окно подтверждения закрываем сразу: повторные клики больше некуда нажимать
        setConfirmDialog({ open: false, message: "", onConfirm: null });
        try {
          await deleteClientApi(client.id);
          onDeleted?.(client.id);
        } catch (e: any) {
          deletingRef.current = false;
          console.error(e);
          setSaveClientErr(
            msgFromError(e, t("crm.clients.details.deleteClientError")),
          );
          setConfirmDialog({ open: false, message: "", onConfirm: null });
        }
      },
    });
  };

  return (
    <ClientModalPortal
      wrapperId="client-edit-modal"
      onEscape={savingClient ? undefined : onClose}
    >
    <div className="cmx__overlay" data-theme={mode} onClick={onClose}>
      <div
        className="cmx__dialog cmx__dialog--lg"
        role="dialog"
        aria-modal="true"
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="cmx__header">
          <div className="cmx__heading">
            <span className="cmx__heading-icon">
              <UserCog />
            </span>
            <div className="cmx__heading-text">
              <h3 className="cmx__title">
                {t("crm.clients.details.editClientLong")}
              </h3>
              <p className="cmx__subtitle">
                {t("crm.clients.details.editClientSubtitle")}
              </p>
            </div>
          </div>
          <button
            className="cmx__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X />
          </button>
        </div>

        <div className="cmx__body">
          {saveClientErr && <div className="cmx__alert">{saveClientErr}</div>}

          <div>
            <div className="cmx__section-title">
              {t("crm.clients.details.contactsSection")}
            </div>
            <div className="cmx__grid">
              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.fullName")} <b className="cmx__req">*</b>
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editFio}
                  onChange={(e: any) => setEditFio(e.target.value)}
                  placeholder={t("crm.clients.details.fullNamePlaceholder")}
                  autoFocus
                  required
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">
                  {t("common.phone")} <b className="cmx__req">*</b>
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editPhone}
                  onChange={(e: any) => setEditPhone(e.target.value)}
                  placeholder="+996 700 00-00-00"
                  required
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">Email</span>
                <input
                  type="email"
                  className="cmx__input"
                  value={editEmail}
                  onChange={(e: any) => setEditEmail(e.target.value)}
                  placeholder="user@mail.com"
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">{t("common.date")}</span>
                <input
                  type="date"
                  className="cmx__input"
                  value={editDate || ""}
                  onChange={(e: any) => setEditDate(e.target.value)}
                />
                <span className="cmx__hint">
                  {t("crm.clients.details.dateHint")}
                </span>
              </label>

              <label className="cmx__field">
                <span className="cmx__label">{t("common.status")}</span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  placeholder="new"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="cmx__section-title">
              {t("crm.clients.details.requisitesTitle")}
            </div>
            <div className="cmx__grid">
              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.llc")}
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editLlc}
                  onChange={(e: any) => setEditLlc(e.target.value)}
                  placeholder={t("crm.clients.details.llcPlaceholder")}
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.inn")}
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editInn}
                  onChange={(e: any) => setEditInn(e.target.value)}
                  placeholder={t("crm.clients.details.innPlaceholder")}
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.okpo")}
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editOkpo}
                  onChange={(e: any) => setEditOkpo(e.target.value)}
                  placeholder={t("crm.clients.details.okpoPlaceholder")}
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.account")}
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editScore}
                  onChange={(e: any) => setEditScore(e.target.value)}
                  placeholder={t("crm.clients.details.accountPlaceholder")}
                />
              </label>

              <label className="cmx__field">
                <span className="cmx__label">
                  {t("crm.clients.details.bik")}
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editBik}
                  onChange={(e: any) => setEditBik(e.target.value)}
                  placeholder={t("crm.clients.details.bikPlaceholder")}
                />
              </label>

              <label className="cmx__field cmx__field--full">
                <span className="cmx__label">
                  {t("crm.clients.details.address")}
                </span>
                <input
                  type="text"
                  className="cmx__input"
                  value={editAddress}
                  onChange={(e: any) => setEditAddress(e.target.value)}
                  placeholder={t("crm.clients.details.addressPlaceholder")}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="cmx__footer">
          <div className="cmx__footer-left">
            <button
              className="cmx__btn cmx__btn--danger"
              onClick={handleDelete}
              disabled={savingClient}
            >
              <Trash2 /> {t("common.delete")}
            </button>
          </div>
          <div className="cmx__footer-right">
            <button
              className="cmx__btn cmx__btn--ghost"
              onClick={onClose}
              disabled={savingClient}
            >
              {t("common.cancel")}
            </button>
            <button
              className="cmx__btn cmx__btn--primary"
              onClick={handleSave}
              disabled={!requiredOk || savingClient}
              title={
                !requiredOk ? t("crm.clients.details.fillRequiredTitle") : ""
              }
            >
              {savingClient ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>

        <AlertModal
          open={confirmDialog.open}
          type="info"
          title=""
          message={confirmDialog.message}
          okText={t("crm.clients.details.confirm")}
          onClose={() =>
            setConfirmDialog({ open: false, message: "", onConfirm: null })
          }
          onConfirm={() => {
            if (confirmDialog.onConfirm) (confirmDialog.onConfirm as any)();
          }}
        />
      </div>
    </div>
    </ClientModalPortal>
  );
}
