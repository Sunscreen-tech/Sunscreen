export type StorageType = 'sessionStorage' | 'localStorage';
export declare class LocalStorage<Configuration extends {}> {
    storage: Storage | null;
    id: string;
    config: Required<Configuration>;
    constructor(id: string, defaultConfig: Required<Configuration>, type?: StorageType);
    getConfiguration(): Required<Configuration>;
    setConfiguration(configuration: Configuration): void;
    _loadConfiguration(): this;
}
//# sourceMappingURL=local-storage.d.ts.map