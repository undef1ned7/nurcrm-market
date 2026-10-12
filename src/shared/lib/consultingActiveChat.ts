/**
 * Какой лид сейчас открыт в мессенджере — чтобы не дублировать
 * звук/колокольчик, когда пользователь уже смотрит этот чат.
 */
let activeLeadId: any = null;

export function setConsultingActiveChatLead(leadId: any) {
  activeLeadId =
    leadId == null || leadId === "" ? null : String(leadId);
}

export function getConsultingActiveChatLead() {
  return activeLeadId;
}

export function isConsultingActiveChatLead(leadId: any) {
  if (activeLeadId == null || leadId == null) return false;
  return String(activeLeadId) === String(leadId);
}
