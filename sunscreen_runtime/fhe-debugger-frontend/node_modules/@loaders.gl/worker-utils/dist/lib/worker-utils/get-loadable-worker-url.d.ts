/**
 * Creates a loadable URL from worker source or URL
 * that can be used to create `Worker` instances.
 * Due to CORS issues it may be necessary to wrap a URL in a small importScripts
 * @param props
 * @param props.source Worker source
 * @param props.url Worker URL
 * @returns loadable url
 */
export declare function getLoadableWorkerURL(props: {
    source?: string;
    url?: string;
}): any;
//# sourceMappingURL=get-loadable-worker-url.d.ts.map