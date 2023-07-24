import { XMLLoaderOptions } from '@loaders.gl/xml';
export type CSWRecords = {
    searchStatus: {
        timestamp?: string;
    };
    searchResults: {
        numberOfRecordsMatched: number;
        numberOfRecordsReturned: number;
        elementSet: string;
        nextRecord: number;
    };
    records: {
        type: string;
        title: string;
        abstract: string;
        subject: string[];
        boundingBoxes: {
            crs: string;
            value: [number, number, number, number];
        }[];
        references: {
            value: string;
            scheme: string;
        }[];
    }[];
};
/**
 * Parses a typed data structure from raw XML for `GetRecords` response
 * @note Error handlings is fairly weak
 */
export declare function parseCSWRecords(text: string, options?: XMLLoaderOptions): CSWRecords;
export declare function renameXMLTags(xml: any, renameKeys: Record<string, string>): void;
//# sourceMappingURL=parse-csw-records.d.ts.map