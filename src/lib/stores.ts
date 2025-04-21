/* Copyright (C) 2025 Ellie Hartung

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

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
export const estrogenPatchesStore = persistentStore<number>(
    "estrogenPatches",
    0,
);
export const estrogenInjectionsStore = persistentStore<number>(
    "estrogenInjections",
    0,
);
