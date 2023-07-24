import type { LoaderOptions } from '@loaders.gl/loader-utils';
/**
 * Gets the current fetch function from options
 * @todo - move to loader-utils module
 * @todo - use in core module counterpart
 * @param options
 * @param context
 */
export declare function getFetchFunction(options?: LoaderOptions): (url: string, fetchOptions?: RequestInit) => Promise<Response>;
export declare function mergeImageServiceProps<Props extends {
    loadOptions?: any;
}>(props: Props): Required<Props>;
//# sourceMappingURL=utils.d.ts.map