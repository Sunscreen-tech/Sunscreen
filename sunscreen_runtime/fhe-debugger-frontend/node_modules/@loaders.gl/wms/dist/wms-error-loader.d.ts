import type { LoaderWithParser, LoaderOptions } from '@loaders.gl/loader-utils';
export type WMSLoaderOptions = LoaderOptions & {
    wms?: {
        /** By default the error loader will throw an error with the parsed error message */
        throwOnError?: boolean;
        /** Do not add any text to errors */
        minimalErrors?: boolean;
    };
};
/**
 * Loader for the response to the WMS GetCapability request
 */
export declare const WMSErrorLoader: {
    id: string;
    name: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    testText: typeof testXMLFile;
    options: {
        wms: {
            throwOnError: boolean;
        };
    };
    parse: (arrayBuffer: ArrayBuffer, options?: WMSLoaderOptions) => Promise<string>;
    parseSync: (arrayBuffer: ArrayBuffer, options?: WMSLoaderOptions) => string;
    parseTextSync: (text: string, options?: WMSLoaderOptions) => string;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckWMSErrorLoader: LoaderWithParser;
export {};
//# sourceMappingURL=wms-error-loader.d.ts.map