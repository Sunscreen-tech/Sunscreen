import type { LoaderContext, LoaderOptions, Loader } from '@loaders.gl/loader-utils';
/**
 * Find a loader that matches file extension and/or initial file content
 * Search the loaders array argument for a loader that matches url extension or initial data
 * Returns: a normalized loader
 * @param data data to assist
 * @param loaders
 * @param options
 * @param context used internally, applications should not provide this parameter
 */
export declare function selectLoader(data: Response | Blob | ArrayBuffer | string, loaders?: Loader[] | Loader, options?: LoaderOptions, context?: LoaderContext): Promise<Loader | null>;
/**
 * Find a loader that matches file extension and/or initial file content
 * Search the loaders array argument for a loader that matches url extension or initial data
 * Returns: a normalized loader
 * @param data data to assist
 * @param loaders
 * @param options
 * @param context used internally, applications should not provide this parameter
 */
export declare function selectLoaderSync(data: Response | Blob | ArrayBuffer | string, loaders?: Loader[] | Loader, options?: LoaderOptions, context?: LoaderContext): Loader | null;
//# sourceMappingURL=select-loader.d.ts.map