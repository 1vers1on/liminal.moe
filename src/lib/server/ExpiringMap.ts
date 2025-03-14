/* Copyright (C) 2025 Eleanor Hartung

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

export type ExpirationCallback<K, V> = (key: K, value: V) => void;

export class ExpiringMap<K, V> {
    private map = new Map<K, { value: V; timeout: NodeJS.Timeout }>();
    private expirationCallback: ExpirationCallback<K, V>;

    constructor(callback: ExpirationCallback<K, V>) {
        this.expirationCallback = callback;
    }

    set(key: K, value: V): void {
        if (this.map.has(key)) {
            const existing = this.map.get(key);
            if (existing) clearTimeout(existing.timeout);
        }

        const timeout = setTimeout(() => {
            this.expire(key);
        }, 60 * 1000);

        this.map.set(key, { value, timeout });
    }

    get(key: K): V | undefined {
        const entry = this.map.get(key);
        return entry ? entry.value : undefined;
    }

    delete(key: K): boolean {
        const entry = this.map.get(key);
        if (entry) {
            clearTimeout(entry.timeout);
            this.map.delete(key);
            return true;
        }
        return false;
    }

    private expire(key: K): void {
        const entry = this.map.get(key);
        if (entry) {
            this.map.delete(key);
            this.expirationCallback(key, entry.value);
        }
    }

    clear(): void {
        this.map.forEach(({ timeout }) => clearTimeout(timeout));
        this.map.clear();
    }

    size(): number {
        return this.map.size;
    }
}
