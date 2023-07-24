import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
import type { CSWRecords } from './lib/parsers/csw/parse-csw-records';
export { CSWRecords };
export type CSWLoaderOptions = XMLLoaderOptions & {
    csw?: {};
};
/**
 * Loader for the response to the CSW GetCapability request
 */
export declare const CSWRecordsLoader: LoaderWithParser;
//# sourceMappingURL=csw-records-loader.d.ts.map