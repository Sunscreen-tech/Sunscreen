import type { Loader, LoaderOptions, LoaderContext } from '../../types';
/**
 * Determines if a loader can parse with worker
 * @param loader
 * @param options
 */
export declare function canParseWithWorker(loader: Loader, options?: LoaderOptions): boolean | "" | undefined;
/**
 * this function expects that the worker function sends certain messages,
 * this can be automated if the worker is wrapper by a call to createLoaderWorker in @loaders.gl/loader-utils.
 */
export declare function parseWithWorker(loader: Loader, data: any, options?: LoaderOptions, context?: LoaderContext, parseOnMainThread?: (arrayBuffer: ArrayBuffer, options: {
    [key: string]: any;
}) => Promise<void>): Promise<any>;
//# sourceMappingURL=parse-with-worker.d.ts.map