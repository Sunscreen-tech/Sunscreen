/**
 * Replacement for Node.js path.filename
 * @param url
 */
export declare function filename(url: string): string;
/**
 * Replacement for Node.js path.dirname
 * @param url
 */
export declare function dirname(url: string): string;
/**
 * Replacement for Node.js path.join
 * @param parts
 */
export declare function join(...parts: string[]): string;
/**
 * https://nodejs.org/api/path.html#path_path_resolve_paths
 * @param paths A sequence of paths or path segments.
 * @return resolved path
 * Forked from BTOdell/path-resolve under MIT license
 * @see https://github.com/BTOdell/path-resolve/blob/master/LICENSE
 */
export declare function resolve(...components: string[]): string;
//# sourceMappingURL=path.d.ts.map