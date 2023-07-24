import type { BatchableDataType, Loader, LoaderContext, LoaderOptions } from '@loaders.gl/loader-utils';
/**
 * Parses `data` using a specified loader
 * @param data
 * @param loaders
 * @param options
 * @param context
 */
export declare function parseInBatches(data: BatchableDataType, loaders?: Loader | Loader[] | LoaderOptions, options?: LoaderOptions, context?: LoaderContext): Promise<AsyncIterable<any>>;
//# sourceMappingURL=parse-in-batches.d.ts.map