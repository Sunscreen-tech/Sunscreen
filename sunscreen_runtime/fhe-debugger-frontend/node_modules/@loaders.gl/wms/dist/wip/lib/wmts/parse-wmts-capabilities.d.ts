/** All capabilities of a WMTS service - response to a WMTS `GetCapabilities` data structure extracted from XML */
export type WMTSCapabilities = {
    serviceIdentification: {
        title: string;
        serviceTypeVersion: string;
        serviceType: string;
    };
    serviceProvider: {
        providerName: string;
        providerSite: string;
        serviceContact: {
            individualName: string;
            positionName: string;
            contactInfo: {
                address: {
                    administrativeArea: string;
                    city: string;
                    country: string;
                    deliveryPoint: string;
                    electronicMailAddress: string;
                    postalCode: string;
                };
                phone: {
                    voice: string;
                };
            };
        };
    };
    operationsMetadata: {
        GetCapabilities: any;
        GetFeatureInfo: any;
        GetTile: any;
    };
    contents: {
        layers: WMTSLayer[];
    };
};
/** A layer in WMTS */
export type WMTSLayer = {
    abstract: string;
    identifier: string;
    title: string;
    formats: string[];
    styles: {
        identifier: string;
        isDefault: string;
        title: string;
        abstract?: string;
    }[];
    bounds: {
        left: number;
        right: number;
        bottom: number;
        top: number;
    };
    tileMatrixSetLinks: {
        tileMatrixSet: string;
    }[];
    tileMatrixSets: WMTSTileMatrixSet[];
};
/** A zoom level in WMTS */
export type WMTSTileMatrixSet = {
    identifier: string;
    matrixIds: {
        identifier: string;
        matrixHeight: number;
        matrixWidth: number;
        scaleDenominator: number;
        tileWidth: number;
        tileHeight: number;
        topLeftCorner: {
            lon: number;
            lat: number;
        };
    };
};
/**
 * Parses a typed data structure from raw XML for `GetCapabilities` response
 * @note Error handlings is fairly weak
 */
export declare function parseWMTSCapabilities(text: string, options: any): WMTSCapabilities;
/**
 * Parses a typed data structure from raw XML for `GetCapabilities` response
 * @note Error handlings is fairly weak
 */
/** Extract typed capability data from XML */
//# sourceMappingURL=parse-wmts-capabilities.d.ts.map