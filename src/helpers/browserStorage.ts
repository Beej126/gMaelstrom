export const getFromSessionStorage = <T>(key: string): T | null => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
}

export const saveToSessionStorage = (key: string, value: object | string | null) => {
    if (value) {
        localStorage.setItem(key, JSON.stringify(value));
    } else {
        localStorage.removeItem(key);
    }
};