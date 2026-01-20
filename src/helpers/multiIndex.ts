import { useCallback, useState, useEffect } from "react";
import BTree from "sorted-btree";


export function useMultiIndexState<ID, V, SortKey>(
  sortKeyOrFn: keyof V | ((v: V) => SortKey),
  filter?: (v: V) => boolean,
  filterEnabled: boolean = true
): [
    MultiIndex<ID, V, SortKey> | undefined,
    (entries: Array<[ID, V]>) => void,
    (id: ID, value: V) => void,
    (id: ID, patch: Partial<V>) => void
  ] {
  const [index, setIndex] = useState<MultiIndex<ID, V, SortKey> | undefined>(undefined);

  const initEntries = useCallback(
    (entries: Array<[ID, V]>) => setIndex(new MultiIndex(sortKeyOrFn, entries, filter, filterEnabled)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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

  // When the external boolean changes, toggle the initial filter on the
  // MultiIndex instance (if present) and rebuild the snapshot.
  useEffect(() => {
    if (index?.setFilterEnabled(filterEnabled)) setIndex(index.bumpIdentity());
  }, [index, filterEnabled]);
  
  return [index, initEntries, setItem, patchItem];
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
  // The originally-provided filter and a boolean that controls whether it is
  // currently applied. The active filter is computed from these two values
  // when rebuilding the snapshot.
  private filter?: (v: V) => boolean;
  private filterEnabled: boolean = false;

  constructor(
    sortKeyOrFn: KeyOf<V> | ((value: V) => SortKey),
    entries: Array<[ID, V]> = [],
    filter?: (v: V) => boolean,
    filterEnabled: boolean = !!filter
  ) {
    this.byId = new Map(entries);

    this.sortKey =
      typeof sortKeyOrFn === "function"
        ? sortKeyOrFn
        : (v: V) => v[sortKeyOrFn] as unknown as SortKey;

    this.bySort = new BTree(
      entries.map(([_id, value]) => [this.sortKey(value), value])
    );

    // store the initial filter and whether it's enabled
    this.filter = filter;
    this.filterEnabled = filterEnabled;
    this.sortedValues = [];
    const active = this.filterEnabled ? this.filter : undefined;
    for (const [, value] of this.bySort.entries()) {
      if (!active || active(value)) {
        this.sortedValues.push(value);
      }
    }
  }

  private rebuildSortedArray() {
    this.sortedValues.length = 0;
    const active = this.filterEnabled ? this.filter : undefined;
    for (const [, value] of this.bySort.entries()) {
      if (!active || active(value)) {
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
   * Enable or disable the initially-provided filter and rebuild the snapshot. 
   * returns true if the filter state was changed, false otherwise.
  */
  setFilterEnabled(enabled: boolean) {
    if (!this.filter || this.filterEnabled === enabled) return false;
    this.filterEnabled = enabled;
    this.rebuildSortedArray();
    return true;
  }

  /** Identity bump for React */
  bumpIdentity(): this {
    return Object.create(
      Object.getPrototypeOf(this),
      Object.getOwnPropertyDescriptors(this)
    );
  }
}
