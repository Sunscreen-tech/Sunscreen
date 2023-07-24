/**
 * fetch compatible function
 * Reads file data from:
 * - http/http urls
 * - data urls
 * - File/Blob objects
 * Leverages `@loaders.gl/polyfills` for Node.js support
 * Respects pathPrefix and file aliases
 */
export declare function fetchFile(url: string | Blob, options?: RequestInit & {
    fetch?: RequestInit | Function;
}): Promise<Response>;
//# sourceMappingURL=fetch-file.d.ts.map