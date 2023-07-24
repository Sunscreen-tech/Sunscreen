import type { LoaderWithParser, LoaderOptions } from '@loaders.gl/loader-utils';
export type GMLLoaderOptions = LoaderOptions & {
    gml?: {};
};
/**
 * Loader for the response to the GML GetCapability request
 */
export declare const GMLLoader: {
    name: string;
    id: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    testText: typeof testXMLFile;
    options: {
        gml: {};
    };
    parse: (arrayBuffer: ArrayBuffer, options?: GMLLoaderOptions) => Promise<import("geojson").Geometry | null>;
    parseTextSync: (text: string, options?: GMLLoaderOptions) => import("geojson").Geometry | null;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckGMLLoader: LoaderWithParser;
export {};
//# sourceMappingURL=gml-loader.d.ts.map