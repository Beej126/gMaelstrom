import { useState } from "react";

export function useStorageState<TVal, TKey extends string = string>(key: TKey, initial: TVal) {

  const [state, setState] = useState<TVal>(() => {
    const raw = localStorage.getItem(key);
    const stored = raw ? JSON.parse(raw) as TVal : null;
    return stored !== null ? stored : initial;
  });

  const setPersistentState = (value: TVal) => {
    setState(value);

    if (value) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.removeItem(key);
    }
  };

  return [state, setPersistentState] as const;
}
