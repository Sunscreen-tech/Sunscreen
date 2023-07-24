import type { XMLLoaderOptions } from '@loaders.gl/xml';
/** Layer description - response to a WMS `DescribeLayer` request  */
export type WMSLayerDescription = {
    layers: {}[];
};
/**
 * Parses a typed data structure from raw XML for `GetFeatureInfo` response
 * @note Error handlings is fairly weak
 */
export declare function parseWMSLayerDescription(text: string, options?: XMLLoaderOptions): WMSLayerDescription;
//# sourceMappingURL=parse-wms-layer-description.d.ts.map