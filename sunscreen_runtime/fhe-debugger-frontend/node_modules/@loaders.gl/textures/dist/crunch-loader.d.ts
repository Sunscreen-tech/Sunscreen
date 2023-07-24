import type { Loader } from '@loaders.gl/loader-utils';
/**
 * Worker loader for the Crunch compressed texture container format
 */
export declare const CrunchLoader: {
    id: string;
    name: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    binary: boolean;
    options: {
        crunch: {
            libraryPath: string;
        };
    };
};
export declare const _TypecheckCrunchLoader: Loader;
//# sourceMappingURL=crunch-loader.d.ts.map