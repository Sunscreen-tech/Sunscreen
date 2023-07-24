export declare function setPathPrefix(prefix: string): void;
export declare function getPathPrefix(): string;
/**
 *
 * @param aliases
 *
 * Note: addAliases are an experimental export, they are only for testing of loaders.gl loaders
 * not intended as a generic aliasing mechanism
 */
export declare function addAliases(aliases: {
    [aliasPath: string]: string;
}): void;
/**
 * Resolves aliases and adds path-prefix to paths
 */
export declare function resolvePath(filename: string): string;
//# sourceMappingURL=file-aliases.d.ts.map