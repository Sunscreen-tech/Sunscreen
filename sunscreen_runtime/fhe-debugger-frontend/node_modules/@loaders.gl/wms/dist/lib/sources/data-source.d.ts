import type { LoaderOptions } from '@loaders.gl/loader-utils';
export type DataSourceProps = {
    /** LoaderOptions provide an option to override `fetch`. Will also be passed to any sub loaders */
    loadOptions?: LoaderOptions;
};
/** base class of all data sources */
export declare abstract class DataSource<PropsT extends DataSourceProps> {
    /** A resolved fetch function extracted from loadOptions prop */
    fetch: (url: string, options?: RequestInit) => Promise<Response>;
    /** The actual load options, if calling a loaders.gl loader */
    loadOptions: LoaderOptions;
    _needsRefresh: boolean;
    props: PropsT;
    constructor(props: PropsT);
    setProps(props: PropsT): void;
    /** Mark this data source as needing a refresh (redraw) */
    setNeedsRefresh(): void;
    /**
     * Does this data source need refreshing?
     * @note The specifics of the refresh mechanism depends on type of data source
     */
    getNeedsRefresh(clear?: boolean): boolean;
}
/**
 * Gets the current fetch function from options
 * @todo - move to loader-utils module
 * @todo - use in core module counterpart
 * @param options
 * @param context
 */
export declare function getFetchFunction(options?: LoaderOptions): (url: string, fetchOptions?: RequestInit) => Promise<Response>;
//# sourceMappingURL=data-source.d.ts.map