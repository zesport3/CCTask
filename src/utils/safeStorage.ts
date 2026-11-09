/**
 * Bulletproof localStorage wrapper.
 * In iOS Safari standalone mode (Add to Home Screen / WebClip) or with Content Restrictions,
 * window.localStorage can throw a SecurityError: "The operation is insecure" or QuotaExceededError.
 * This wrapper guarantees safe get/set/remove operations without crashing the app.
 */

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn('safeStorage: localStorage.getItem falhou, a usar memória:', e);
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn('safeStorage: localStorage.setItem falhou, a guardar em memória:', e);
    }
    memoryStore.set(key, value);
    return true;
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('safeStorage: localStorage.removeItem falhou:', e);
    }
    memoryStore.delete(key);
  },
};
