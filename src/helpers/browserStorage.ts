import { STORAGE_KEY_PREFIX } from "../ctxSettings";

export const getFromStorage = <T>(key: string, storage: Storage): T | null => {
    const raw = storage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) as T : null;
};

export const saveToStorage = (key: string, value: object | string | null, storage: Storage) => {
    if (value) {
        storage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } else {
        storage.removeItem(STORAGE_KEY_PREFIX + key);
    }
};

export const getFromSessionStorage = <T>(key: string): T | null => getFromStorage<T>(key, sessionStorage);
export const saveToSessionStorage = (key: string, value: object | string | null) => saveToStorage(key, value, sessionStorage);

export const getFromLocalStorage = <T>(key: string): T | null => getFromStorage<T>(key, localStorage);
export const saveToLocalStorage = (key: string, value: object | string | null) => saveToStorage(key, value, localStorage);