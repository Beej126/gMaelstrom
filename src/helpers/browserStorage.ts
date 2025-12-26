export const getFromStorage = <T>(key: string): T | null => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
}

export const saveToStorage = (key: string, value: object | string | null) => {
    if (value) {
        localStorage.setItem(key, JSON.stringify(value));
    } else {
        localStorage.removeItem(key);
    }
};