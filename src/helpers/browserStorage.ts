const APP_STORAGE_KEY_PREFIX = "gMaelstrom_" as const; //just to make them stand out in browser storage UIs versus any other keys created by other dependencies (auth, etc)

const getFromStorage = <T>(key: string, storage: Storage): T | null => {
    const raw = storage.getItem(APP_STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) as T : null;
};

const saveToStorage = (key: string, value: boolean | string | number | object | null, storage: Storage) => {
    if (value) {
        storage.setItem(APP_STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } else {
        storage.removeItem(APP_STORAGE_KEY_PREFIX + key);
    }
};

export const getFromSessionStorage = <T>(key: string): T | null => getFromStorage<T>(key, sessionStorage);
export const saveToSessionStorage = <T extends boolean | string | number | object | null>(key: string, value: T) => saveToStorage(key, value, sessionStorage);

export const getFromLocalStorage = <T>(key: string): T | null => getFromStorage<T>(key, localStorage);
export const saveToLocalStorage = <T extends boolean | string | number | object | null>(key: string, value: T) => saveToStorage(key, value, localStorage);