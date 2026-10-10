/**
 * One localStorage key, shared safely between every open tab.
 *
 * The browser tools (/log, /tempo, /session, /readiness, /breakthrough) used to
 * keep their whole state in React memory and write all of it back to the key
 * on every change. Two tabs open on the same tool therefore raced: each held
 * the snapshot it loaded, and whichever wrote last replaced everything the
 * other had saved. A session logged in one tab vanished the moment a checkbox
 * was ticked in the other.
 *
 * The rule this module enforces is read-modify-write. A change is a function
 * of the *latest stored* value, applied at the moment of the change, never of
 * the copy a tab happened to load. `subscribeToStoredKey` closes the other half:
 * when another tab writes, every tab re-reads, so what is on screen is what is
 * stored.
 *
 * Pure apart from the storage handle it is given, so it runs under `node
 * --test` with an in-memory stand-in for `localStorage`.
 */

export type StorageArea = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * What a read found.
 *
 * `available: false` is not the same as an empty key. Private windows and
 * blocked storage throw on access, and treating that as "nothing saved" would
 * make every change start from empty and throw away what the tab is showing.
 * Callers fall back to their in-memory copy instead.
 */
export type StoredRead<T> =
  | { available: true; value: T | null }
  | { available: false };

export type StoredValue<T> = {
  readonly key: string;
  /** The latest value in storage, validated by `restore`. */
  read: () => StoredRead<T>;
  /** Write a value, or remove the key for `null`. False when storage refused. */
  write: (value: T | null) => boolean;
  /**
   * Apply `change` to the latest stored value and write the result.
   *
   * `fallback` is used only when storage cannot be read at all, which keeps a
   * private window working from memory exactly as it did before.
   */
  update: (
    fallback: T | null,
    change: (latest: T | null) => T | null,
  ) => { value: T | null; persisted: boolean };
};

export type StoredValueOptions<T> = {
  key: string;
  /**
   * Validate a parsed payload. Return null when the payload is unusable; the
   * key is then removed, as each tool already did on a corrupt value.
   */
  restore: (parsed: unknown) => T | null;
  /** The JSON written for a value. Defaults to the value itself. */
  serialize?: (value: T) => unknown;
  /** Defaults to `window.localStorage`, looked up on every call. */
  storage?: () => StorageArea;
};

function browserStorage(): StorageArea {
  return window.localStorage;
}

export function createStoredValue<T>(options: StoredValueOptions<T>): StoredValue<T> {
  const { key, restore } = options;
  const serialize = options.serialize ?? ((value: T) => value);
  const storage = options.storage ?? browserStorage;

  function remove(): boolean {
    try {
      storage().removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function read(): StoredRead<T> {
    let raw: string | null;
    try {
      raw = storage().getItem(key);
    } catch {
      return { available: false };
    }
    if (raw === null || raw === "") return { available: true, value: null };

    let restored: T | null = null;
    try {
      restored = restore(JSON.parse(raw));
    } catch {
      restored = null;
    }
    // Unreadable is dropped rather than kept: leaving it would make every
    // later read fail the same way, and no tool can show it anyway.
    if (restored === null) remove();
    return { available: true, value: restored };
  }

  function write(value: T | null): boolean {
    if (value === null) return remove();
    try {
      storage().setItem(key, JSON.stringify(serialize(value)));
      return true;
    } catch {
      return false;
    }
  }

  function update(
    fallback: T | null,
    change: (latest: T | null) => T | null,
  ): { value: T | null; persisted: boolean } {
    const latest = read();
    const base = latest.available ? latest.value : fallback;
    const next = change(base);
    // Returning the value it was given is how a change says "nothing to do",
    // such as a refused entry. Writing it back would only wake the other tabs.
    if (next === base) return { value: next, persisted: latest.available };
    const persisted = latest.available ? write(next) : false;
    return { value: next, persisted };
  }

  return { key, read, write, update };
}

type StorageEventTarget = {
  addEventListener: (type: "storage", listener: (event: StorageEvent) => void) => void;
  removeEventListener: (type: "storage", listener: (event: StorageEvent) => void) => void;
};

/**
 * Call `onChange` when another tab writes, removes, or clears `key`.
 *
 * The browser fires `storage` only in the *other* tabs, never in the one that
 * wrote, so a tab's own updates do not echo back through here. A `null` key
 * means the whole store was cleared.
 */
export function subscribeToStoredKey(
  key: string,
  onChange: () => void,
  target: StorageEventTarget = window,
): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key === key || event.key === null) onChange();
  };
  target.addEventListener("storage", listener);
  return () => target.removeEventListener("storage", listener);
}

/**
 * Carry checked-off progress from one plan to its rebuild.
 *
 * Ids are derived from what each item is, so an item that survives a rebuild
 * unchanged keeps its id and its tick. Only ids the new plan no longer has are
 * dropped, and they are reported so the caller can ask before discarding them.
 */
export function carryProgress(
  previous: readonly string[],
  nextIds: Iterable<string>,
): { kept: string[]; dropped: string[] } {
  const valid = new Set(nextIds);
  const unique = [...new Set(previous)];
  return {
    kept: unique.filter((id) => valid.has(id)),
    dropped: unique.filter((id) => !valid.has(id)),
  };
}

/**
 * Set one id on or off, rather than toggling it.
 *
 * A toggle computed from a stale copy flips the wrong way when another tab has
 * already ticked the same box. Stating the wanted end state makes the change
 * mean the same thing whatever the latest stored list holds.
 */
export function setMembership(
  ids: readonly string[],
  id: string,
  member: boolean,
): string[] {
  const without = ids.filter((existing) => existing !== id);
  return member ? [...without, id] : without;
}
