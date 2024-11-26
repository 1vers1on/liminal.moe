import { writable, get } from "svelte/store";

export function persistentStore<T>(key: string, data: T) {
    const store = writable(data);
    const { subscribe, set, update } = store;
    const isBrowser = typeof window !== "undefined";

    if (isBrowser) {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            set(JSON.parse(storedValue));
        }
    }

    return {
        subscribe,
        set: (n: T) => {
            if (isBrowser) {
                localStorage.setItem(key, JSON.stringify(n));
            }
            set(n);
        },
        update: (cb: (store: T) => T) => {
            const updatedStore = cb(get(store));

            if (isBrowser) {
                localStorage.setItem(key, JSON.stringify(updatedStore));
            }
            set(updatedStore);
        },
        get: () => get(store),
    };
}

export const estrogenStore = persistentStore<number>("estrogen", 0);
export const progesteroneStore = persistentStore<number>("progesterone", 0);
export const spiroStore = persistentStore<number>("spiro", 0);
export const bicaStore = persistentStore<number>("bica", 0);
export const cyrpoStore = persistentStore<number>("cyro", 0);

export const estrogenGelStore = persistentStore<number>("estrogenGel", 0);
export const estrogenPillsStore = persistentStore<number>("estrogenPills", 0);
export const estrogenPatchesStore = persistentStore<number>("estrogenPatches", 0);
export const estrogenInjectionsStore = persistentStore<number>("estrogenInjections", 0);
