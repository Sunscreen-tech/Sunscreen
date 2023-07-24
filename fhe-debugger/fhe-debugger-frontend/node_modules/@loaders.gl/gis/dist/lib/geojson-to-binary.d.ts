import type { Feature } from '@loaders.gl/schema';
import type { BinaryFeatures } from '@loaders.gl/schema';
/**
 * Options for `geojsonToBinary`
 */
export type GeojsonToBinaryOptions = {
    fixRingWinding: boolean;
    numericPropKeys?: string[];
    PositionDataType?: Float32ArrayConstructor | Float64ArrayConstructor;
};
/**
 * Convert GeoJSON features to flat binary arrays
 *
 * @param features
 * @param options
 * @returns features in binary format, grouped by geometry type
 */
export declare function geojsonToBinary(features: Feature[], options?: GeojsonToBinaryOptions): BinaryFeatures;
//# sourceMappingURL=geojson-to-binary.d.ts.map