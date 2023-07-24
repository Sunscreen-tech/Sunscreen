export declare class LocalStorage<Configuration extends {}> {
    storage: Storage;
    id: string;
    config: Required<Configuration>;
    constructor(id: string, defaultConfig: Required<Configuration>, type?: string);
    getConfiguration(): Required<Configuration>;
    setConfiguration(configuration: Configuration): void;
    _loadConfiguration(): this;
}
//# sourceMappingURL=local-storage.d.ts.map