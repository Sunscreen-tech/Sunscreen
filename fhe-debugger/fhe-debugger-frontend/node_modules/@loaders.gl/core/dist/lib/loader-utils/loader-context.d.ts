import type { Loader, LoaderOptions, LoaderContext } from '@loaders.gl/loader-utils';
/**
 * "sub" loaders invoked by other loaders get a "context" injected on `this`
 * The context will inject core methods like `parse` and contain information
 * about loaders and options passed in to the top-level `parse` call.
 *
 * @param context
 * @param options
 * @param previousContext
 */
export declare function getLoaderContext(context: Omit<LoaderContext, 'fetch'> & Partial<Pick<LoaderContext, 'fetch'>>, options: LoaderOptions, parentContext: LoaderContext | null): LoaderContext;
export declare function getLoadersFromContext(loaders: Loader[] | Loader | undefined, context?: LoaderContext): any;
//# sourceMappingURL=loader-context.d.ts.map