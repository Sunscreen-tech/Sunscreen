import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
export type WMTSLoaderOptions = XMLLoaderOptions & {
    wmts?: {};
};
/**
 * Loader for the response to the WMTS GetCapability request
 */
export declare const WMTSCapabilitiesLoader: {
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
    parse: (arrayBuffer: ArrayBuffer, options?: WMTSLoaderOptions) => Promise<import("./lib/wmts/parse-wmts-capabilities").WMTSCapabilities>;
    parseTextSync: (text: string, options?: WMTSLoaderOptions) => import("./lib/wmts/parse-wmts-capabilities").WMTSCapabilities;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckWMTSCapabilitiesLoader: LoaderWithParser;
export {};
//# sourceMappingURL=wmts-capabilities-loader.d.ts.map