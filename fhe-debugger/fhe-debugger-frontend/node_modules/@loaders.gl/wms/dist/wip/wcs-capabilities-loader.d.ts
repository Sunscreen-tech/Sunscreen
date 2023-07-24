import type { LoaderWithParser, LoaderOptions } from '@loaders.gl/loader-utils';
import type { WCSCapabilities } from './lib/wcs/parse-wcs-capabilities';
export { WCSCapabilities };
export type WCSLoaderOptions = LoaderOptions & {
    wcs?: {};
};
/**
 * Loader for the response to the WCS GetCapability request
 */
export declare const WCSCapabilitiesLoader: {
    id: string;
    name: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    testText: typeof testXMLFile;
    options: {
        wms: {};
    };
    parse: (arrayBuffer: ArrayBuffer, options?: WCSLoaderOptions) => Promise<WCSCapabilities>;
    parseTextSync: (text: string, options?: WCSLoaderOptions) => WCSCapabilities;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckWFSCapabilitiesLoader: LoaderWithParser;
//# sourceMappingURL=wcs-capabilities-loader.d.ts.map