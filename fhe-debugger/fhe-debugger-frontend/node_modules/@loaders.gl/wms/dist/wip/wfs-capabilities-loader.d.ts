import type { LoaderWithParser, LoaderOptions } from '@loaders.gl/loader-utils';
import type { WFSCapabilities } from './lib/wfs/parse-wfs-capabilities';
export type { WFSCapabilities };
export type WFSLoaderOptions = LoaderOptions & {
    wfs?: {};
};
/**
 * Loader for the response to the WFS GetCapability request
 */
export declare const WFSCapabilitiesLoader: {
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
    parse: (arrayBuffer: ArrayBuffer, options?: WFSLoaderOptions) => Promise<WFSCapabilities>;
    parseTextSync: (text: string, options?: WFSLoaderOptions) => WFSCapabilities;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckWFSCapabilitiesLoader: LoaderWithParser;
//# sourceMappingURL=wfs-capabilities-loader.d.ts.map