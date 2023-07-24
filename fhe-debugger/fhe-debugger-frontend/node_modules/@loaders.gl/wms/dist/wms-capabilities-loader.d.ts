import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
export type { WMSCapabilities, WMSLayer, WMSBoundingBox, WMSDimension, WMSRequest, WMSExceptions } from './lib/parsers/wms/parse-wms-capabilities';
export type WMSCapabilitiesLoaderOptions = XMLLoaderOptions & {
    wms?: {
        /** Add inherited layer information to sub layers */
        inheritedLayerProps?: boolean;
        /** Include the "raw" JSON (parsed but untyped, unprocessed XML). May contain additional fields */
        includeRawData?: boolean;
        /** Include the original XML document text. May contain additional information. */
        includeXMLText?: boolean;
        /** @deprecated Use options.includeRawData` */
        raw?: boolean;
    };
};
/**
 * Loader for the response to the WMS GetCapability request
 */
export declare const WMSCapabilitiesLoader: {
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
    parse: (arrayBuffer: ArrayBuffer, options?: WMSCapabilitiesLoaderOptions) => Promise<import("./lib/parsers/wms/parse-wms-capabilities").WMSCapabilities>;
    parseTextSync: (text: string, options?: WMSCapabilitiesLoaderOptions) => import("./lib/parsers/wms/parse-wms-capabilities").WMSCapabilities;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckWMSCapabilitiesLoader: LoaderWithParser;
//# sourceMappingURL=wms-capabilities-loader.d.ts.map