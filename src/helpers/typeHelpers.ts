export function makeStringEnum<T extends string>(keys: T[]): { [K in T]: K } {
  return keys.reduce((res, key) => {
    res[key] = key;
    return res;
  }, {} as { [K in T]: K });
}

export type EnumValue<T> = T[keyof T];
