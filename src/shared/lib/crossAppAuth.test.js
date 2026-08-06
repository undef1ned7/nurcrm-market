import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  canHandoffToBuildingApp,
  tryRedirectToBuildingApp,
  buildAuthRedirectUrl,
  resolveBuildingAppPath,
} from "./crossAppAuth";

vi.mock("./appUrls", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getBuildingAppPath: (path) => `https://stroy.nurcrm.kg${path}`,
    isAllowedBuildingAppOrigin: (originOrUrl) => {
      try {
        const origin = new URL(originOrUrl, "https://dummy.local").origin;
        return (
          origin === "https://stroy.nurcrm.kg" ||
          origin.startsWith("http://localhost") ||
          origin.startsWith("http://127.0.0.1")
        );
      } catch {
        return false;
      }
    },
  };
});

describe("crossAppAuth", () => {
  const future = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().slice(0, 10);
  };

  const past = () => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d.toISOString().slice(0, 10);
  };

  let hrefValue = "http://localhost/";

  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(String(k), String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
    hrefValue = "http://localhost/";
    vi.stubGlobal("location", {
      get href() {
        return hrefValue;
      },
      set href(next) {
        hrefValue = String(next);
      },
      origin: "http://localhost",
      assign: vi.fn((next) => {
        hrefValue = String(next);
      }),
      replace: vi.fn((next) => {
        hrefValue = String(next);
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolveBuildingAppPath maps crm building routes", () => {
    expect(resolveBuildingAppPath("/crm/building/salary")).toBe(
      "/building/salary",
    );
    expect(resolveBuildingAppPath("/login")).toBe("/building/projects");
  });

  it("buildAuthRedirectUrl puts tokens in hash, not query", () => {
    const url = buildAuthRedirectUrl(
      "https://stroy.nurcrm.kg/building/projects",
      {
        access: "a1",
        refresh: "r1",
        sector: "building",
      },
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("accessToken")).toBeNull();
    expect(parsed.searchParams.get("refreshToken")).toBeNull();
    expect(parsed.searchParams.get("sector")).toBe("building");
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    expect(hash.get("accessToken")).toBe("a1");
    expect(hash.get("refreshToken")).toBe("r1");
    expect(hash.get("sector")).toBe("building");
  });

  it("buildAuthRedirectUrl rejects untrusted origins", () => {
    expect(() =>
      buildAuthRedirectUrl("https://evil.example/steal", {
        access: "a1",
        refresh: "r1",
      }),
    ).toThrow(/allowlist/);
  });

  it("canHandoffToBuildingApp requires sector, subscription and token", () => {
    expect(
      canHandoffToBuildingApp({
        sector: { name: "Строительная компания" },
        end_date: future(),
      }),
    ).toBe(false);

    localStorage.setItem("accessToken", "token");
    expect(
      canHandoffToBuildingApp({
        sector: { name: "Строительная компания" },
        end_date: future(),
      }),
    ).toBe(true);

    expect(
      canHandoffToBuildingApp({
        sector: { name: "Строительная компания" },
        end_date: past(),
      }),
    ).toBe(false);

    expect(
      canHandoffToBuildingApp({
        sector: { name: "Магазин" },
        end_date: future(),
      }),
    ).toBe(false);
  });

  it("tryRedirectToBuildingApp returns expired for inactive subscription", () => {
    localStorage.setItem("accessToken", "token");
    expect(
      tryRedirectToBuildingApp({
        sector: { name: "Строительная компания" },
        end_date: past(),
      }),
    ).toBe("expired");
    expect(hrefValue).toBe("http://localhost/");
  });

  it("tryRedirectToBuildingApp redirects for active building company", () => {
    localStorage.setItem("accessToken", "token");
    localStorage.setItem("refreshToken", "refresh");
    expect(
      tryRedirectToBuildingApp({
        sector: { name: "Строительная компания" },
        end_date: future(),
      }),
    ).toBe("redirected");
    expect(hrefValue).toContain("#");
    expect(hrefValue).toContain("accessToken=token");
    expect(hrefValue).toContain("sector=building");
  });
});
