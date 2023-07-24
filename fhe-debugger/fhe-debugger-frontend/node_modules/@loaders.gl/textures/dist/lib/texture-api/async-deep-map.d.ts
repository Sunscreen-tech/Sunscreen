export type Options = Record<string, any>;
export type Func = (url: string, options: Options) => unknown;
export declare function asyncDeepMap(tree: unknown, func: Func, options?: Options): Promise<unknown>;
export declare function mapSubtree(object: unknown, func: Func, options: Options): Promise<unknown>;
//# sourceMappingURL=async-deep-map.d.ts.map