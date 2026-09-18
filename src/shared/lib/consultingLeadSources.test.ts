import { describe, it, expect } from "vitest";
import {
  normalizeNotificationUrl,
  isConsultingLeadTransferEvent,
  isConsultingLeadAssignEvent,
  isConsultingLeadNoReplyEvent,
  resolveConsultingNotificationUrl,
} from "./consultingLeadSources";

describe("normalizeNotificationUrl", () => {
  it("maps legacy /crm/subscription → /crm/additional-services", () => {
    expect(normalizeNotificationUrl("/crm/subscription")).toBe(
      "/crm/additional-services",
    );
    expect(normalizeNotificationUrl("/crm/subscription/")).toBe(
      "/crm/additional-services",
    );
  });

  it("keeps query string when remapping", () => {
    expect(normalizeNotificationUrl("/crm/subscription?tab=plan")).toBe(
      "/crm/additional-services?tab=plan",
    );
  });

  it("passes through unknown, absolute and empty urls untouched", () => {
    expect(normalizeNotificationUrl("/crm/consulting/leads")).toBe(
      "/crm/consulting/leads",
    );
    expect(normalizeNotificationUrl("https://app.nurcrm.kg/x")).toBe(
      "https://app.nurcrm.kg/x",
    );
    expect(normalizeNotificationUrl("")).toBe("");
    expect(normalizeNotificationUrl(null)).toBe("");
  });
});

describe("agent_* events are not treated as lead transfers", () => {
  it("agent_transfer is not a lead transfer event", () => {
    const n = { type: "agent_transfer", title: "Перемещение агенту", message: "" };
    expect(isConsultingLeadTransferEvent(n)).toBe(false);
  });

  it("agent_return is not a lead transfer event", () => {
    const n = { type: "agent_return", title: "Возврат от агента", message: "" };
    expect(isConsultingLeadTransferEvent(n)).toBe(false);
  });

  it("real lead transfer still matches", () => {
    expect(
      isConsultingLeadTransferEvent({ type: "lead.transferred" }),
    ).toBe(true);
    expect(
      isConsultingLeadTransferEvent({
        type: "system",
        title: "Вам передан лид",
      }),
    ).toBe(true);
  });
});

describe("lead_alert subtype (data.alert_kind) routing", () => {
  it("assigned subtype routes to funnel card", () => {
    const n = {
      type: "lead_alert",
      title: "Новый лид",
      data: { alert_kind: "assigned", lead_id: "L1" },
      meta: { lead_id: "L1" },
    };
    expect(isConsultingLeadAssignEvent(n)).toBe(true);
    expect(resolveConsultingNotificationUrl(n)).toContain(
      "/crm/consulting/funnel",
    );
  });

  it("transferred subtype is a lead transfer", () => {
    const n = {
      type: "lead_alert",
      data: { alert_kind: "transferred", lead_id: "L2" },
    };
    expect(isConsultingLeadTransferEvent(n)).toBe(true);
  });

  it("sla_breach / no_activity / task_overdue subtypes are no-reply alerts", () => {
    for (const alert_kind of ["sla_breach", "no_activity", "task_overdue"]) {
      expect(
        isConsultingLeadNoReplyEvent({ type: "lead_alert", data: { alert_kind } }),
      ).toBe(true);
    }
  });

  it("unanswered_lead_alert is a no-reply alert without subtype", () => {
    expect(
      isConsultingLeadNoReplyEvent({ type: "unanswered_lead_alert" }),
    ).toBe(true);
  });
});

describe("resolveConsultingNotificationUrl normalizes legacy /crm paths", () => {
  it("rewrites /crm/subscription coming in url", () => {
    expect(
      resolveConsultingNotificationUrl({ type: "tariff", url: "/crm/subscription" }),
    ).toBe("/crm/additional-services");
  });
});
