import type { LoaderWithParser, LoaderOptions, LoaderContext } from '@loaders.gl/loader-utils';
type FileType = string | File | Blob | Response | (string | File | Blob | Response)[] | FileList;
/**
 * Parses `data` using a specified loader
 * @param data
 * @param loaders
 * @param options
 * @param context
 */
export declare function loadInBatches(files: FileType, loaders?: LoaderWithParser | LoaderWithParser[] | LoaderOptions, options?: LoaderOptions, context?: LoaderContext): Promise<AsyncIterable<any>>;
export declare function loadInBatches(files: FileType[] | FileList, loaders?: LoaderWithParser | LoaderWithParser[] | LoaderOptions, options?: LoaderOptions, context?: LoaderContext): Promise<AsyncIterable<any>>;
export {};
//# sourceMappingURL=load-in-batches.d.ts.map