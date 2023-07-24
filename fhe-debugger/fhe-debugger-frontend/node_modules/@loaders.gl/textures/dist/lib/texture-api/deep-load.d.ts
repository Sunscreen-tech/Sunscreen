export type LoadOptions = Record<string, any>;
export type Load = (data: ArrayBuffer, options: Record<string, any>) => Promise<any>;
export declare function deepLoad(urlTree: unknown, load: Load, options: LoadOptions): Promise<unknown>;
export declare function shallowLoad(url: string, load: Load, options: LoadOptions): Promise<any>;
//# sourceMappingURL=deep-load.d.ts.map