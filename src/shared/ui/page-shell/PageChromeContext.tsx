import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const PageChromeContext = createContext<any>(null);

/**
 * Bridges page chrome (title / subtitle / actions) into the layout Header.
 * When `active` is false (fullscreen routes without Header), PageHeader
 * falls back to rendering the in-page header.
 */
export function PageChromeProvider({ children, active = true }: any) {
  const [meta, setMetaState] = useState<any>(null);
  const [actions, setActionsState] = useState<any>(null);

  const setMeta = useCallback((next: any) => {
    setMetaState(next);
  }, []);

  const setActions = useCallback((next: any) => {
    setActionsState(next);
  }, []);

  const value = useMemo(
    () => ({
      active: Boolean(active),
      meta,
      setMeta,
      actions,
      setActions,
    }),
    [active, meta, setMeta, actions, setActions],
  );

  return (
    <PageChromeContext.Provider value={value}>
      {children}
    </PageChromeContext.Provider>
  );
}

export function usePageChrome() {
  const ctx = useContext(PageChromeContext);
  if (!ctx) {
    return {
      active: false,
      meta: null,
      setMeta: () => {},
      actions: null,
      setActions: () => {},
    };
  }
  return ctx;
}
