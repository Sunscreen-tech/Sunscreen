import type { XMLLoaderOptions } from '@loaders.gl/xml';
/** Describes the values of resource */
export type CSWDomain = {
    domainValues: {
        type: string;
        propertyName: string;
        values: {
            [key: string]: unknown;
        }[];
    }[];
};
/**
 * Parses a typed data structure from raw XML for `GetDomain` response
 * @note Error handlings is fairly weak
 */
export declare function parseCSWDomain(text: string, options?: XMLLoaderOptions): CSWDomain;
//# sourceMappingURL=parse-csw-domain.d.ts.map