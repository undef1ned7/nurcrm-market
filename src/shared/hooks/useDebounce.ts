import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

export const useDebounce = (callback: any, delay = 1000) => {
  const timer = useRef<any>();

  return (arg: any) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      callback(arg);
    }, delay);
  };
};


export const useDebouncedValue = (value: any, delay = 400, callback: any) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      callback?.()
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, callback]);

  return debouncedValue;
};

export const useDebouncedAction = (
  actionCreator: any,
  delay = 600,
  transform: any = (e: any) => e?.target?.value ?? e
) => {
  const dispatch = useDispatch();
  const debounced = useDebounce((v: any) => dispatch(actionCreator(v)), delay);

  return useCallback(
    (e: any) => {
      debounced(transform(e));
    },
    [debounced, transform]
  );
};

/**
 * Отдельный debounce-таймер на каждый ключ (например id строки корзины).
 * schedule(key, fn) перезапускает таймер только для этого key; cancel(key) снимает ожидание.
 */
export const useDebounceByKey = (delay = 400) => {
  const timersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const schedule = useCallback(
    (key: any, fn: any) => {
      const k = String(key);
      const prev = timersRef.current.get(k);
      if (prev) clearTimeout(prev);
      const id = setTimeout(() => {
        timersRef.current.delete(k);
        fn();
      }, delay);
      timersRef.current.set(k, id);
    },
    [delay],
  );

  const cancel = useCallback((key: any) => {
    const k = String(key);
    const prev = timersRef.current.get(k);
    if (prev) {
      clearTimeout(prev);
      timersRef.current.delete(k);
    }
  }, []);

  return { schedule, cancel };
};
