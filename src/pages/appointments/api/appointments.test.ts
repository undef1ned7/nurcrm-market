import { describe, expect, it } from "vitest";
import {
  buildAppointmentPayload,
  daySlots,
  normalizeAppointment,
  overlapsExisting,
  validateAppointmentDraft,
} from "./appointments";

describe("normalizeAppointment", () => {
  it("starts_at в UTC переводится во время Бишкека", () => {
    expect(
      normalizeAppointment({ id: 1, starts_at: "2026-10-06T04:30:00Z", performer: { id: 7 } }),
    ).toMatchObject({ date: "2026-10-06", time: "10:30", performerId: "7", durationMin: 60 });
  });

  it("date + time и duration_minutes", () => {
    expect(
      normalizeAppointment({ id: 2, date: "2026-10-06", time: "15:00:00", duration_minutes: 90 }),
    ).toMatchObject({ time: "15:00", durationMin: 90 });
  });
});

describe("validateAppointmentDraft", () => {
  const ok = {
    clientId: "c",
    performerId: "m",
    serviceId: "s",
    date: "2026-10-06",
    time: "10:00",
    durationMin: "60",
    note: "",
  };
  it("валидно и по полям", () => {
    expect(validateAppointmentDraft(ok)).toBeNull();
    expect(validateAppointmentDraft({ ...ok, performerId: "" })).toBe("performer");
    expect(validateAppointmentDraft({ ...ok, time: "25:00" })).toBe("time");
    expect(validateAppointmentDraft({ ...ok, durationMin: "0" })).toBe("duration");
    expect(validateAppointmentDraft({ ...ok, durationMin: "1.5" })).toBe("duration");
  });

  it("payload с началом в +06:00", () => {
    expect(buildAppointmentPayload(ok)).toMatchObject({
      starts_at: "2026-10-06T10:00:00+06:00",
      duration_minutes: 60,
    });
  });
});

describe("overlapsExisting", () => {
  const list = [
    normalizeAppointment({ id: "a", performer: "m", date: "2026-10-06", time: "10:00", duration_minutes: 60 })!,
    normalizeAppointment({ id: "b", performer: "m", date: "2026-10-06", time: "12:00", duration_minutes: 30, status: "canceled" })!,
  ];
  it("пересечение у того же мастера", () => {
    expect(overlapsExisting(list, "m", "2026-10-06", "10:30", 30)).toBe(true);
    expect(overlapsExisting(list, "m", "2026-10-06", "11:00", 30)).toBe(false);
    expect(overlapsExisting(list, "other", "2026-10-06", "10:30", 30)).toBe(false);
  });
  it("отменённые записи не мешают", () => {
    expect(overlapsExisting(list, "m", "2026-10-06", "12:00", 30)).toBe(false);
  });
});

it("сетка дня 08:00–20:30 по 30 минут", () => {
  const s = daySlots();
  expect(s[0]).toBe("08:00");
  expect(s.at(-1)).toBe("20:30");
  expect(s).toHaveLength(26);
});
