import { useCallback, useState } from "react";
import BTree from "sorted-btree";


export function useMultiIndexState<ID, V, SortKey>(
  sortKeyOrFn: keyof V | ((v: V) => SortKey),
  initialFilter?: (v: V) => boolean
): [
  MultiIndex<ID, V, SortKey> | undefined,
  (entries: Array<[ID, V]>) => void,
  (id: ID, value: V) => void,
  (id: ID, patch: Partial<V>) => void
] {
  const [index, setIndex] = useState<MultiIndex<ID, V, SortKey> | undefined>(undefined);

  const initialize = useCallback(
    (entries: Array<[ID, V]>) => {
      setIndex(new MultiIndex(sortKeyOrFn, entries, initialFilter));
    },
    [sortKeyOrFn, initialFilter]
  );

  const setItem = useCallback(
    (id: ID, value: V) => {
      if (!index) {
        throw new Error("MultiIndex is not initialized");
      }

      index.delete(id);
      index.insert(id, value);

      setIndex(index.bumpIdentity());
    },
    [index]
  );

  const patchItem = useCallback(
    (id: ID, patch: Partial<V>) => {

      const existing = index?.get(id);
      if (!existing) return;

      // delegate to setItem
      setItem(id, { ...existing, ...patch });
    },
    [index, setItem]
  );

  return [index, initialize, setItem, patchItem];
};


type KeyOf<T> = Extract<keyof T, string | number | symbol>;

export class MultiIndex<ID, V, SortKey> {
  private readonly byId: Map<ID, V>;
  private readonly bySort: BTree<SortKey, V>;
  private readonly sortKey: (value: V) => SortKey;

  /** Always-up-to-date sorted array of values. When a filter is set, this
   * contains the filtered snapshot; otherwise it contains the full sorted list.
   */
  readonly sortedValues: V[];
  private filterFn?: (v: V) => boolean;

  constructor(
    sortKeyOrFn: KeyOf<V> | ((value: V) => SortKey),
    entries: Array<[ID, V]> = [],
    initialFilter?: (v: V) => boolean
  ) {
    this.byId = new Map(entries);

    this.sortKey =
      typeof sortKeyOrFn === "function"
        ? sortKeyOrFn
        : (v: V) => v[sortKeyOrFn] as unknown as SortKey;

    this.bySort = new BTree(
      entries.map(([_id, value]) => [this.sortKey(value), value])
    );

    // materialize sorted array once (no filter initially)
    this.sortedValues = [];
    for (const [, value] of this.bySort.entries()) {
      this.sortedValues.push(value);
    }
    this.filterFn = initialFilter;
    // apply initial filter if present
    this.sortedValues = [];
    for (const [, value] of this.bySort.entries()) {
      if (!this.filterFn || this.filterFn(value)) {
        this.sortedValues.push(value);
      }
    }
  }

  private rebuildSortedArray() {
    this.sortedValues.length = 0;
    for (const [, value] of this.bySort.entries()) {
      if (!this.filterFn || this.filterFn(value)) {
        this.sortedValues.push(value);
      }
    }
  }

  get count(): number {
    return this.sortedValues.length;
  }

  get(id: ID | undefined): V | undefined {
    if (id === undefined) return undefined;
    return this.byId.get(id);
  }

  insert(id: ID, value: V): void {
    this.byId.set(id, value);
    this.bySort.set(this.sortKey(value), value);
    this.rebuildSortedArray();
  }

  delete(id: ID): void {
    const value = this.byId.get(id);
    if (value === undefined) return;

    this.byId.delete(id);
    this.bySort.delete(this.sortKey(value));
    this.rebuildSortedArray();
  }

  /**
   * Set an optional filter. When `filter` is `undefined`, `sortedValues` will
   * contain the full sorted list. When provided, `sortedValues` will be
   * replaced with a filtered snapshot. The computation runs once when the
   * filter is set and again whenever data changes (insert/delete).
   */
  setFilter(filter?: (v: V) => boolean) {
    this.filterFn = filter;
    this.rebuildSortedArray();
  }

  /** Identity bump for React */
  bumpIdentity(): this {
    return Object.create(
      Object.getPrototypeOf(this),
      Object.getOwnPropertyDescriptors(this)
    );
  }
}
