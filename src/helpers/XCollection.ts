import { useCallback, useState, useEffect } from "react";
import BTree from "sorted-btree";


export function useXCollectionState<ID, V, SortKey>(
  indexKey: keyof V,
  sortKeyOrFn: keyof V | ((v: V) => SortKey),
  filter?: (v: V) => boolean,
  filterEnabled: boolean = true
): {
  sortedFiltered: V[],
  byId: (key: ID | undefined) => V | undefined,
  setEntries: (entries: Array<[ID, V]>) => void,
  setItem: (id: ID, value: V) => void,
  patchItem: (existing: V, patch: Partial<V>) => void
} {
  const [collection, setCollection] = useState<XCollection<ID, V, SortKey>>(new XCollection(sortKeyOrFn, [], filter, filterEnabled));

  const setEntries = useCallback((entries: Array<[ID, V]>) => {
    setCollection((prev) => {
      prev.setEntries(entries);
      return prev.bumpIdentity();
    });
  }, []);


  const setItem = useCallback((id: ID, value: V) => {
    setCollection((prev) => {
      prev.delete(id, true);
      prev.insert(id, value);
      return prev.bumpIdentity();
    });
  }, []);

  const patchItem = useCallback((existing: V, patch: Partial<V>) => {
    if (!existing) return;
    const id = existing[indexKey] as ID;
    setItem(id, { ...existing, ...patch });
  }, [indexKey, setItem]);


  // When the external boolean changes, toggle the initial filter on the
  // MultiIndex instance (if present) and rebuild the snapshot.
  useEffect(() => {
    if (collection?.setFilterEnabled(filterEnabled)) setCollection(collection.bumpIdentity());
  }, [collection, filterEnabled]);


  return {
    sortedFiltered: collection.sortedValues,
    byId: (key: ID | undefined) => collection.get(key),
    setEntries,
    setItem,
    patchItem,
  };
};


type KeyOf<T> = Extract<keyof T, string | number | symbol>;

export class XCollection<ID, V, SortKey> {
  readonly byId: Map<ID, V>;
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
    this.byId = new Map();

    this.sortKey =
      typeof sortKeyOrFn === "function"
        ? sortKeyOrFn
        : (v: V) => v[sortKeyOrFn] as unknown as SortKey;

    this.bySort = new BTree();

    // store the initial filter and whether it's enabled
    this.filter = filter;
    this.filterEnabled = filterEnabled;
    this.sortedValues = [];

    // populate initial entries using shared logic
    this.setEntries(entries);
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

  delete(id: ID, postponeRebuild: boolean = false): void {
    const value = this.byId.get(id);
    if (value === undefined) return;

    this.byId.delete(id);
    this.bySort.delete(this.sortKey(value));
    if (!postponeRebuild) this.rebuildSortedArray();
  }

  /** Replace the collection entries with the given array and rebuild. */
  setEntries(entries: Array<[ID, V]>): void {
    // clear existing maps/trees
    this.byId.clear();
    const existing = Array.from(this.bySort.entries());
    for (const [k] of existing) {
      this.bySort.delete(k);
    }

    // populate
    for (const [id, value] of entries) {
      this.byId.set(id, value);
      this.bySort.set(this.sortKey(value), value);
    }

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
