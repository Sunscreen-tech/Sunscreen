import type { Loader, LoaderOptions } from '@loaders.gl/loader-utils';
/**
 * Global state for loaders.gl. Stored on `global.loaders._state`
 */
type GlobalLoaderState = {
    loaderRegistry: Loader[];
    globalOptions: LoaderOptions;
};
/**
 * Helper for safely accessing global loaders.gl variables
 * Wraps initialization of global variable in function to defeat overly aggressive tree-shakers
 */
export declare function getGlobalLoaderState(): GlobalLoaderState;
/**
 * Store global loader options on the global object to increase chances of cross loaders-version interoperability
 * NOTE: This use case is not reliable but can help when testing new versions of loaders.gl with existing frameworks
 * @returns global loader options merged with default loader options
 */
export declare const getGlobalLoaderOptions: () => LoaderOptions;
/**
 * Set global loader options
 * @param options
 */
export declare function setGlobalOptions(options: LoaderOptions): void;
/**
 * Merges options with global opts and loader defaults, also injects baseUri
 * @param options
 * @param loader
 * @param loaders
 * @param url
 */
export declare function normalizeOptions(options: LoaderOptions, loader: Loader, loaders?: Loader[], url?: string): LoaderOptions;
export {};
//# sourceMappingURL=option-utils.d.ts.map