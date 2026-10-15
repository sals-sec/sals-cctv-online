interface StorageAdapter {
  get: (k: string) => string | null;
  set: (k: string, v: string) => void;
  del: (k: string) => void;
}

function mkStore(kind: 'localStorage' | 'sessionStorage'): StorageAdapter {
  const mem: Record<string, string> = {};
  try {
    const s = window[kind];
    s.setItem('__t', '1');
    s.removeItem('__t');
    return {
      get: (k: string) => s.getItem(k),
      set: (k: string, v: string) => s.setItem(k, v),
      del: (k: string) => s.removeItem(k),
    };
  } catch {
    return {
      get: (k: string) => (k in mem ? mem[k] : null),
      set: (k: string, v: string) => {
        mem[k] = v;
      },
      del: (k: string) => {
        delete mem[k];
      },
    };
  }
}

export const store = mkStore('localStorage');
export const sess = mkStore('sessionStorage');

export function load<T>(key: string, defaultValue: T): T {
  try {
    const val = store.get(key);
    return val ? (JSON.parse(val) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function save<T>(key: string, value: T): boolean {
  try {
    store.set(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
