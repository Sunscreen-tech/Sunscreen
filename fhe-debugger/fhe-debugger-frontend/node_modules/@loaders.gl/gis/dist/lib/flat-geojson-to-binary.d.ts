import type { BinaryFeatures, FlatFeature, GeojsonGeometryInfo } from '@loaders.gl/schema';
import { PropArrayConstructor } from './flat-geojson-to-binary-types';
/**
 * Convert binary features to flat binary arrays. Similar to
 * `geojsonToBinary` helper function, except that it expects
 * a binary representation of the feature data, which enables
 * 2X-3X speed increase in parse speed, compared to using
 * geoJSON. See `binary-vector-tile/VectorTileFeature` for
 * data format detais
 *
 * @param features
 * @param geometryInfo
 * @param options
 * @returns filled arrays
 */
export declare function flatGeojsonToBinary(features: FlatFeature[], geometryInfo: GeojsonGeometryInfo, options?: FlatGeojsonToBinaryOptions): BinaryFeatures;
/**
 * Options for `flatGeojsonToBinary`
 */
export type FlatGeojsonToBinaryOptions = {
    numericPropKeys?: string[];
    PositionDataType?: Float32ArrayConstructor | Float64ArrayConstructor;
};
export declare const TEST_EXPORTS: {
    extractNumericPropTypes: typeof extractNumericPropTypes;
};
/**
 * Extracts properties that are always numeric
 *
 * @param features
 * @returns object with numeric types
 */
declare function extractNumericPropTypes(features: FlatFeature[]): {
    [key: string]: PropArrayConstructor;
};
export {};
//# sourceMappingURL=flat-geojson-to-binary.d.ts.map