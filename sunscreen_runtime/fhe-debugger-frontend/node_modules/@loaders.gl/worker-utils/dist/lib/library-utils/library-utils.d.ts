/**
 * Dynamically loads a library ("module")
 *
 * - wasm library: Array buffer is returned
 * - js library: Parse JS is returned
 *
 * Method depends on environment
 * - browser - script element is created and installed on document
 * - worker - eval is called on global context
 * - node - file is required
 *
 * @param libraryUrl
 * @param moduleName
 * @param options
 */
export declare function loadLibrary(libraryUrl: string, moduleName?: string | null, options?: object): Promise<any>;
export declare function getLibraryUrl(library: string, moduleName?: string, options?: any): string;
//# sourceMappingURL=library-utils.d.ts.map