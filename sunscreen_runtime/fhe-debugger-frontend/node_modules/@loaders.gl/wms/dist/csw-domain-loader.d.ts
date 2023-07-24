import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
import type { CSWDomain } from './lib/parsers/csw/parse-csw-domain';
export type { CSWDomain };
export type CSWLoaderOptions = XMLLoaderOptions & {
    csw?: {};
};
/**
 * Loader for the response to the CSW GetCapability request
 */
export declare const CSWDomainLoader: {
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
    parse: (arrayBuffer: ArrayBuffer, options?: CSWLoaderOptions) => Promise<CSWDomain>;
    parseTextSync: (text: string, options?: CSWLoaderOptions) => CSWDomain;
};
declare function testXMLFile(text: string): boolean;
export declare const _typecheckCSWDomainLoader: LoaderWithParser;
//# sourceMappingURL=csw-domain-loader.d.ts.map