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
