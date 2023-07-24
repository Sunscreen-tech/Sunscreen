import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
import type { CSWCapabilities } from './lib/parsers/csw/parse-csw-capabilities';
export type { CSWCapabilities };
/** CSW loader options */
export type CSWLoaderOptions = XMLLoaderOptions & {
    csw?: {};
};
/**
 * Loader for the response to the CSW GetCapability request
 */
export declare const CSWCapabilitiesLoader: {
    id: string;
    name: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    testText: typeof testXMLFile;
    options: {
        csw: {};
    };
    parse: (arrayBuffer: ArrayBuffer, options?: CSWLoaderOptions) => Promise<CSWCapabilities>;
    parseTextSync: (text: string, options?: CSWLoaderOptions) => CSWCapabilities;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckCSWCapabilitiesLoader: LoaderWithParser;
//# sourceMappingURL=csw-capabilities-loader.d.ts.map