import { Feature, FlatFeature } from '@loaders.gl/schema';
/**
 * Options for `geojsonToFlatGeojson`
 */
export type GeojsonToFlatGeojsonOptions = {
    coordLength: number;
    fixRingWinding: boolean;
};
/**
 * Convert GeoJSON features to Flat GeoJSON features
 *
 * @param features
 * @param options
 * @returns an Array of Flat GeoJSON features
 */
export declare function geojsonToFlatGeojson(features: Feature[], options?: GeojsonToFlatGeojsonOptions): FlatFeature[];
//# sourceMappingURL=geojson-to-flat-geojson.d.ts.map