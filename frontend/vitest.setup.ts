/**
 * Node >= 22 defines an experimental `globalThis.localStorage` getter that
 * returns undefined unless the process is started with --localstorage-file.
 * That built-in shadows jsdom's localStorage when vitest populates globals,
 * so DOM tests would see `localStorage === undefined`. Restore a working
 * in-memory Storage for jsdom test files.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof document !== "undefined" && !globalThis.localStorage) {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}
