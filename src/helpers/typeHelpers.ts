export function makeStringEnum<T extends string>(keys: T[]): { [K in T]: K } {
  return keys.reduce((res, key) => {
    res[key] = key;
    return res;
  }, {} as { [K in T]: K });
}

export type EnumValue<T> = T[keyof T];


export function arrayToRecord<T>(array: T[] | undefined, lookupPropertyName: string): { [key: string]: T } | undefined {
    if (!array || !array.length) return undefined;

    return Object.assign({}, ...array.map(item => ({ [(item as Expando)[lookupPropertyName]]: item })));
}
