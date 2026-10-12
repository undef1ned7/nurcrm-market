import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { ReactNode } from "react";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@shared/api", () => ({ default: apiMock }));

import { productReducer, resetCatalogVersionSupport } from "@entities/product";
import { useWarehouseData } from "./useWarehouseData";

const page = (name: string) => ({ count: 1, next: null, previous: null, results: [{ id: name, name, kind: "product" }] });

const setup = () => {
  const store = configureStore({ reducer: { product: productReducer } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(({ params }) => useWarehouseData(params), {
    wrapper,
    initialProps: { params: { page: 1 } as Record<string, unknown> },
  });
  return { store, hook };
};

const listCalls = () => apiMock.get.mock.calls.filter(([u]) => String(u).includes("products/list"));
const names = (hook: any) => hook.result.current.products.map((p: any) => p.name);

beforeEach(() => {
  apiMock.get.mockReset();
  resetCatalogVersionSupport();
});

describe("склад: кэш списка и версия каталога", () => {
  it("каталог не менялся — возврат на страницу без нового запроса списка", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      String(url).includes("catalog-version")
        ? Promise.resolve({ data: { version: "v1" } })
        : Promise.resolve({ data: page(`стр ${cfg?.params?.page}`) }),
    );
    const { hook } = setup();
    await waitFor(() => expect(names(hook)).toEqual(["стр 1"]));
    hook.rerender({ params: { page: 2 } });
    await waitFor(() => expect(names(hook)).toEqual(["стр 2"]));
    // 1-й возврат: в кэше нет версии — список обновляется и запоминает версию
    hook.rerender({ params: { page: 1 } });
    await waitFor(() => expect(listCalls()).toHaveLength(3));
    hook.rerender({ params: { page: 2 } });
    await waitFor(() => expect(listCalls()).toHaveLength(4));
    // 2-й возврат: версия та же — показываем кэш, списка не качаем
    hook.rerender({ params: { page: 1 } });
    await waitFor(() => expect(names(hook)).toEqual(["стр 1"]));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(listCalls()).toHaveLength(4);
    expect(hook.result.current.loading).toBe(false);
  });

  it("каталог изменился — кэш показывается сразу, затем список обновляется", async () => {
    let version = "v1";
    let label = "старое";
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      String(url).includes("catalog-version")
        ? Promise.resolve({ data: { version } })
        : Promise.resolve({ data: page(`${label} ${cfg?.params?.page}`) }),
    );
    const { hook } = setup();
    await waitFor(() => expect(names(hook)).toEqual(["старое 1"]));
    hook.rerender({ params: { page: 2 } });
    await waitFor(() => expect(names(hook)).toEqual(["старое 2"]));
    version = "v2";
    label = "новое";
    hook.rerender({ params: { page: 1 } });
    await waitFor(() => expect(names(hook)).toEqual(["новое 1"]));
  });

  it("ответ запроса ушедшей страницы не перетирает кэш текущей", async () => {
    let releasePage2: (v: unknown) => void = () => {};
    apiMock.get.mockImplementation((url: string, cfg: any) => {
      if (String(url).includes("catalog-version")) return Promise.resolve({ data: { version: "v1" } });
      const p = cfg?.params?.page;
      if (p === 2 && listCalls().length > 2) {
        return new Promise((res) => {
          releasePage2 = () => res({ data: page("стр 2 (поздно)") });
        });
      }
      return Promise.resolve({ data: page(`стр ${p}`) });
    });
    const { hook } = setup();
    await waitFor(() => expect(names(hook)).toEqual(["стр 1"]));
    hook.rerender({ params: { page: 2 } });
    await waitFor(() => expect(names(hook)).toEqual(["стр 2"]));
    hook.rerender({ params: { page: 1 } });
    await waitFor(() => expect(listCalls()).toHaveLength(3)); // кэш без версии — обновили, версию запомнили
    hook.rerender({ params: { page: 2 } }); // медленный запрос стр. 2
    await waitFor(() => expect(listCalls()).toHaveLength(4));
    hook.rerender({ params: { page: 1 } }); // кэш стр. 1, версия та же — без запроса
    await waitFor(() => expect(names(hook)).toEqual(["стр 1"]));
    await act(async () => {
      releasePage2(null);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(names(hook)).toEqual(["стр 1"]);
  });
});
