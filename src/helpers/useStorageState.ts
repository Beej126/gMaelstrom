import { useState } from "react";
import { getFromLocalStorage, saveToLocalStorage } from "./browserStorage";

export function useLocalStorageState<TVal extends boolean | string | object | null, TKey extends string = string>(key: TKey, initial: TVal) {

  const [state, setState] = useState<TVal>(getFromLocalStorage(key) ?? initial);

  const setPersistentState = (value: TVal) => {
    setState(value);
    saveToLocalStorage(key, value);
  };

  return [state, setPersistentState] as const;
}
