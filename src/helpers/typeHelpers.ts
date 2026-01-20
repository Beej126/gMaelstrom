export type NonNullableProps<T> = { [K in keyof T]: NonNullable<T[K]>; };
export type StrictRequired<T> = { [K in keyof T]-?: NonNullable<T[K]>; };


export function makeStringEnum<T extends string>(keys: T[]): { [K in T]: K } {
  return keys.reduce((res, key) => {
    res[key] = key;
    return res;
  }, {} as { [K in T]: K });
}

export type EnumValue<T> = T[keyof T];


export function arrayToRecord<T, K extends keyof T, V extends keyof T | undefined = undefined>(
  array: T[] | undefined,
  lookupPropertyName: K,
  valuePropertyName?: V
): Record<PropertyKey, V extends keyof T ? T[V] : T> | undefined {
  if (!array || !array.length) return undefined;

  return Object.assign(
    {},
    ...array.map(item => ({
      [String(item[lookupPropertyName]) as PropertyKey]:
        valuePropertyName ? item[valuePropertyName] : item
    }))
  );
}
