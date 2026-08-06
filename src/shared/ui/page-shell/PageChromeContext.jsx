/* eslint-disable react-refresh/only-export-components -- provider + hook pair */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const PageChromeContext = createContext(null);

/**
 * Bridges page chrome (title / subtitle / actions) into the layout Header.
 * When `active` is false (fullscreen routes without Header), PageHeader
 * falls back to rendering the in-page header.
 */
export function PageChromeProvider({ children, active = true }) {
  const [meta, setMetaState] = useState(null);
  const [actions, setActionsState] = useState(null);

  const setMeta = useCallback((next) => {
    setMetaState(next);
  }, []);

  const setActions = useCallback((next) => {
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
