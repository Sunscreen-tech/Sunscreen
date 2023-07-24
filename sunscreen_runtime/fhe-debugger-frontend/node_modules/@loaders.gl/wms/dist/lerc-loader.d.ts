import type { LoaderWithParser, LoaderOptions } from '@loaders.gl/loader-utils';
import type { LERCData } from './lib/parsers/lerc/lerc-types';
export type LERCLoaderOptions = LoaderOptions & {
    lerc?: {
        /**	The number of bytes to skip in the input byte stream. A valid Lerc file is expected at that position. */
        inputOffset?: number;
        /**	It is recommended to use the returned mask instead of setting this value. */
        noDataValue?: number;
        /**	(ndepth LERC2 only) If true, returned depth values are pixel-interleaved. */
        returnInterleaved?: boolean;
    };
};
/**
 * Loader for the LERC raster format
 */
export declare const LERCLoader: {
    id: string;
    name: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    options: {
        wms: {};
    };
    parse: (arrayBuffer: ArrayBuffer, options?: LERCLoaderOptions) => Promise<LERCData>;
};
export declare const _typecheckLERCLoader: LoaderWithParser;
//# sourceMappingURL=lerc-loader.d.ts.map