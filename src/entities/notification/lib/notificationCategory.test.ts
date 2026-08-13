import { describe, expect, it } from "vitest";
import {
  formatUnreadBadge,
  matchesNotificationTab,
  notificationCategory,
} from "./notificationCategory";

describe("notificationCategory", () => {
  it("reads explicit category", () => {
    expect(notificationCategory({ category: "tariff" })).toBe("tariff");
    expect(notificationCategory({ type: "maintenance" })).toBe("system");
    expect(notificationCategory({ kind: "news" })).toBe("news");
    expect(notificationCategory({ title: "hello" })).toBe("other");
  });

  it("filters tabs without guessing from title", () => {
    const item = { title: "Тариф заканчивается", category: "system" };
    expect(matchesNotificationTab(item, "system")).toBe(true);
    expect(matchesNotificationTab(item, "tariff")).toBe(false);
    expect(matchesNotificationTab(item, "all")).toBe(true);
  });

  it("caps unread badge", () => {
    expect(formatUnreadBadge(0)).toBe("");
    expect(formatUnreadBadge(7)).toBe("7");
    expect(formatUnreadBadge(120)).toBe("99+");
  });
});
