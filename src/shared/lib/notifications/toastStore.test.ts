import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  addToast,
  dismissToast,
  getToastsSnapshot,
  subscribeToasts,
} from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getToastsSnapshot().forEach((toast) => dismissToast(toast.id));
    vi.runAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds and auto-dismisses toast", () => {
    addToast({ type: "success", message: "Done" });
    expect(getToastsSnapshot()).toHaveLength(1);
    expect(getToastsSnapshot()[0].message).toBe("Done");

    vi.advanceTimersByTime(5000);
    vi.runAllTimers();
    expect(getToastsSnapshot()).toHaveLength(0);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    addToast({ type: "info", message: "Hello" });
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
