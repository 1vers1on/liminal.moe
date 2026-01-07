interface FileEntry {
    path: string;
    name: string;
    type: 'file' | 'directory';
    content?: ArrayBuffer | string;
    mimeType?: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    parentPath: string;
}

interface VFSOptions {
    dbName?: string;
    storeName?: string;
}

class VirtualFileSystem {
    private db: IDBDatabase | null = null;
    private dbName: string;
    private storeName: string;

    constructor(options: VFSOptions = {}) {
        this.dbName = options.dbName ?? 'virtual-fs';
        this.storeName = options.storeName ?? 'files';
    }

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`Initializing VFS with DB: ${this.dbName}, Store: ${this.storeName}`);
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'path' });
                    store.createIndex('parentPath', 'parentPath', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    private ensureDb(): IDBDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    private normalizePath(path: string): string {
        let normalized = path.replace(/\/+/g, '/').replace(/\/$/, '');
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }
        return normalized || '/';
    }

    private getParentPath(path: string): string {
        const normalized = this.normalizePath(path);
        if (normalized === '/') return '/';
        const parts = normalized.split('/').filter(Boolean);
        parts.pop();
        return '/' + parts.join('/') || '/';
    }

    private getFileName(path: string): string {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    }

    async createDirectory(path: string): Promise<FileEntry> {
        const db = this.ensureDb();
        const normalizedPath = this.normalizePath(path);
        const parentPath = this.getParentPath(normalizedPath);

        if (parentPath !== '/' && normalizedPath !== '/') {
            const parent = await this.stat(parentPath);
            if (!parent || parent.type !== 'directory') {
                throw new Error(`Parent directory does not exist: ${parentPath}`);
            }
        }

        const entry: FileEntry = {
            path: normalizedPath,
            name: this.getFileName(normalizedPath),
            type: 'directory',
            size: 0,
            createdAt: new Date(),
            modifiedAt: new Date(),
            parentPath,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(entry);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(entry);
        });
    }

    async writeFile(
        path: string,
        content: ArrayBuffer | string,
        mimeType?: string
    ): Promise<FileEntry> {
        const db = this.ensureDb();
        const normalizedPath = this.normalizePath(path);
        const parentPath = this.getParentPath(normalizedPath);

        if (parentPath !== '/') {
            const parent = await this.stat(parentPath);
            if (!parent || parent.type !== 'directory') {
                throw new Error(`Parent directory does not exist: ${parentPath}`);
            }
        }

        const size = typeof content === 'string'
            ? new Blob([content]).size
            : content.byteLength;

        const entry: FileEntry = {
            path: normalizedPath,
            name: this.getFileName(normalizedPath),
            type: 'file',
            content,
            mimeType,
            size,
            createdAt: new Date(),
            modifiedAt: new Date(),
            parentPath,
        };

        const existing = await this.stat(normalizedPath);
        if (existing) {
            entry.createdAt = existing.createdAt;
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(entry);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(entry);
        });
    }

    async readFile(path: string): Promise<ArrayBuffer | string | undefined> {
        const entry = await this.stat(path);
        if (!entry) {
            throw new Error(`File not found: ${path}`);
        }
        if (entry.type !== 'file') {
            throw new Error(`Not a file: ${path}`);
        }
        return entry.content;
    }

    async readTextFile(path: string): Promise<string> {
        const content = await this.readFile(path);
        if (content instanceof ArrayBuffer) {
            return new TextDecoder().decode(content);
        }
        return content ?? '';
    }

    async stat(path: string): Promise<FileEntry | null> {
        const db = this.ensureDb();
        const normalizedPath = this.normalizePath(path);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(normalizedPath);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result ?? null);
        });
    }

    async exists(path: string): Promise<boolean> {
        const entry = await this.stat(path);
        return entry !== null;
    }

    async isDirectory(path: string): Promise<boolean> {
        const entry = await this.stat(path);
        return entry !== null && entry.type === 'directory';
    }

    async readDirectory(path: string): Promise<FileEntry[]> {
        const db = this.ensureDb();
        const normalizedPath = this.normalizePath(path);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('parentPath');
            const request = index.getAll(normalizedPath);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async delete(path: string, recursive = false): Promise<void> {
        const db = this.ensureDb();
        const normalizedPath = this.normalizePath(path);
        const entry = await this.stat(normalizedPath);

        if (!entry) {
            throw new Error(`Path not found: ${path}`);
        }

        if (entry.type === 'directory') {
            const children = await this.readDirectory(normalizedPath);
            if (children.length > 0 && !recursive) {
                throw new Error(`Directory not empty: ${path}`);
            }
            // Delete children recursively
            for (const child of children) {
                await this.delete(child.path, true);
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(normalizedPath);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async move(sourcePath: string, destPath: string): Promise<FileEntry> {
        const entry = await this.stat(sourcePath);
        if (!entry) {
            throw new Error(`Source not found: ${sourcePath}`);
        }

        const normalizedDest = this.normalizePath(destPath);
        const destParent = this.getParentPath(normalizedDest);

        if (destParent !== '/') {
            const parent = await this.stat(destParent);
            if (!parent || parent.type !== 'directory') {
                throw new Error(`Destination parent does not exist: ${destParent}`);
            }
        }

        if (entry.type === 'directory') {
            const children = await this.readDirectory(sourcePath);
            for (const child of children) {
                const childNewPath = child.path.replace(
                    this.normalizePath(sourcePath),
                    normalizedDest
                );
                await this.move(child.path, childNewPath);
            }
        }

        const newEntry: FileEntry = {
            ...entry,
            path: normalizedDest,
            name: this.getFileName(normalizedDest),
            parentPath: destParent,
            modifiedAt: new Date(),
        };

        const db = this.ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            store.delete(this.normalizePath(sourcePath));
            const request = store.put(newEntry);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(newEntry);
        });
    }

    async copy(sourcePath: string, destPath: string): Promise<FileEntry> {
        const entry = await this.stat(sourcePath);
        if (!entry) {
            throw new Error(`Source not found: ${sourcePath}`);
        }

        const normalizedDest = this.normalizePath(destPath);

        if (entry.type === 'directory') {
            await this.createDirectory(normalizedDest);
            const children = await this.readDirectory(sourcePath);
            for (const child of children) {
                const childNewPath = child.path.replace(
                    this.normalizePath(sourcePath),
                    normalizedDest
                );
                await this.copy(child.path, childNewPath);
            }
            return (await this.stat(normalizedDest))!;
        } else {
            return this.writeFile(normalizedDest, entry.content!, entry.mimeType);
        }
    }

    async createDirectoryRecursive(path: string): Promise<FileEntry> {
        const normalizedPath = this.normalizePath(path);
        const parts = normalizedPath.split('/').filter(Boolean);

        let currentPath = '';
        let lastEntry: FileEntry | null = null;

        for (const part of parts) {
            currentPath += '/' + part;
            const exists = await this.exists(currentPath);
            if (!exists) {
                lastEntry = await this.createDirectory(currentPath);
            } else {
                lastEntry = await this.stat(currentPath);
            }
        }

        return lastEntry!;
    }

    async clear(): Promise<void> {
        const db = this.ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

export { VirtualFileSystem, type FileEntry, type VFSOptions };
