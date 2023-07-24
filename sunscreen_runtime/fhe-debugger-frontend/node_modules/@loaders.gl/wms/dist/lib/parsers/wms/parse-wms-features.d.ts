/** WMS Feature info - response to a WMS `GetFeatureInfo` request */
export type WMSFeatureInfo = {
    features: WMSFeature[];
};
export type WMSFeature = {
    attributes: Record<string, number | string>;
    type: string;
    bounds: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
};
/**
 * Parses a typed data structure from raw XML for `GetFeatureInfo` response
 * @note Error handlings is fairly weak
 */
export declare function parseWMSFeatureInfo(text: string, options: any): WMSFeatureInfo;
//# sourceMappingURL=parse-wms-features.d.ts.map