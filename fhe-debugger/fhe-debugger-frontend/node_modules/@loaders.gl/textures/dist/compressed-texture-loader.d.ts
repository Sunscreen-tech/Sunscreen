import type { Loader, LoaderWithParser } from '@loaders.gl/loader-utils';
export type TextureLoaderOptions = {
    'compressed-texture'?: {
        libraryPath?: string;
        useBasis?: boolean;
    };
};
/**
 * Worker Loader for KTX, DDS, and PVR texture container formats
 */
export declare const CompressedTextureWorkerLoader: {
    name: string;
    id: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    binary: boolean;
    options: {
        'compressed-texture': {
            libraryPath: string;
            useBasis: boolean;
        };
    };
};
/**
 * Loader for KTX, DDS, and PVR texture container formats
 */
export declare const CompressedTextureLoader: {
    parse: (arrayBuffer: any, options: any) => Promise<import("@loaders.gl/schema").TextureLevel[]>;
    name: string;
    id: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    binary: boolean;
    options: {
        'compressed-texture': {
            libraryPath: string;
            useBasis: boolean;
        };
    };
};
export declare const _TypecheckCompressedTextureWorkerLoader: Loader;
export declare const _TypecheckCompressedTextureLoader: LoaderWithParser;
//# sourceMappingURL=compressed-texture-loader.d.ts.map