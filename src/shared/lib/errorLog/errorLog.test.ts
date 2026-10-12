import { beforeEach, describe, expect, it } from "vitest";
import {
  ERROR_LOG_FILE_LIMIT,
  clearErrorLog,
  formatErrorLogAsText,
  logError,
  logWarning,
  readErrorLog,
  safeRequestPath,
  sanitizeLogText,
} from "./errorLog";
import { captureApiError, markNetworkRestored } from "./captureApi";

beforeEach(() => {
  localStorage.clear();
  markNetworkRestored();
  clearErrorLog();
});

describe("sanitizeLogText", () => {
  it("вычищает токены и пароли", () => {
    const text = sanitizeLogText(
      'Bearer abc.def.ghi password=hunter2 {"token":"xyz"} access: eyJhbGciOi.eyJzdWIiOiIx.sig12345678',
    );
    expect(text).not.toMatch(/abc\.def\.ghi|hunter2|xyz|eyJhbGciOi/);
  });
  it("обрезает длинные сообщения", () => {
    expect(sanitizeLogText("x".repeat(2000)).length).toBeLessThan(600);
  });
});

describe("safeRequestPath", () => {
  it("убирает домен и query-строку", () => {
    expect(safeRequestPath("https://app.nurcrm.kg/api/main/x/?token=1&a=2")).toBe("/api/main/x/");
    expect(safeRequestPath("main/products/list/?search=a")).toBe("main/products/list/");
  });
});

describe("журнал", () => {
  it("пишет записи и читает новые сверху", () => {
    logWarning("first", { code: "network_lost" });
    logError("second");
    const log = readErrorLog();
    expect(log).toHaveLength(2);
    expect(log[0].message).toBe("second");
  });

  it("не дублирует одинаковые записи подряд", () => {
    logWarning("same", { code: "network_lost" });
    logWarning("same", { code: "network_lost" });
    expect(readErrorLog()).toHaveLength(1);
  });

  it("ротация: хранятся два последних «файла»", () => {
    for (let i = 0; i < ERROR_LOG_FILE_LIMIT * 2 + 5; i += 1) logError(`e${i}`);
    const log = readErrorLog();
    expect(log.length).toBeGreaterThan(ERROR_LOG_FILE_LIMIT);
    expect(log.length).toBeLessThanOrEqual(ERROR_LOG_FILE_LIMIT * 2 + 1);
    expect(log[0].message).toBe(`e${ERROR_LOG_FILE_LIMIT * 2 + 4}`);
    expect(log.some((e) => e.message === "e0")).toBe(false);
  });

  it("текстовая выгрузка содержит подпись", () => {
    logError("boom");
    const text = formatErrorLogAsText(readErrorLog(), { Компания: "ACME" });
    expect(text.startsWith("Компания: ACME")).toBe(true);
    expect(text).toContain("boom");
  });
});

describe("captureApiError", () => {
  const axiosErr = (over: any) => ({ isAxiosError: true, config: { url: "/api/main/x/?t=1", method: "get" }, ...over });

  it("обрыв связи пишется один раз, восстановление — отдельной записью", () => {
    captureApiError(axiosErr({ code: "ERR_NETWORK", message: "Network Error" }));
    captureApiError(axiosErr({ code: "ERR_NETWORK", message: "Network Error" }));
    expect(readErrorLog().filter((e) => e.code === "network_lost")).toHaveLength(1);
    markNetworkRestored();
    expect(readErrorLog().some((e) => e.code === "network_restored")).toBe(true);
  });

  it("403 → недостаточно прав, 402 → подписка, 500 → ошибка сервера, 401 игнорируется", () => {
    captureApiError(axiosErr({ response: { status: 403, data: { detail: "no" } } }));
    captureApiError(axiosErr({ response: { status: 402, data: {} } }));
    captureApiError(axiosErr({ response: { status: 500, data: {} } }));
    captureApiError(axiosErr({ response: { status: 401, data: {} } }));
    const codes = readErrorLog().map((e) => e.code);
    expect(codes).toEqual(expect.arrayContaining(["permission_denied", "subscription_expired", "server_error"]));
    expect(readErrorLog()).toHaveLength(3);
  });

  it("query-строка запроса в журнал не попадает", () => {
    captureApiError(axiosErr({ response: { status: 500, data: {} } }));
    expect(JSON.stringify(readErrorLog())).not.toContain("t=1");
  });
});
