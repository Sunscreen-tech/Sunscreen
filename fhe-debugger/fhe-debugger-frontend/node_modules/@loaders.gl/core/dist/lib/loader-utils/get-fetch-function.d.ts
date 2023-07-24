import type { LoaderContext, LoaderOptions } from '@loaders.gl/loader-utils';
import { fetchFile } from '../fetch/fetch-file';
/**
 * Gets the current fetch function from options and context
 * @param options
 * @param context
 */
export declare function getFetchFunction(options?: LoaderOptions, context?: Omit<LoaderContext, 'fetch'> & Partial<Pick<LoaderContext, 'fetch'>>): ((url: string, options?: RequestInit | undefined) => Promise<Response>) | typeof fetchFile;
//# sourceMappingURL=get-fetch-function.d.ts.map