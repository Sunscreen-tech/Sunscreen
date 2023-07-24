import type { BinaryFeatures } from '@loaders.gl/schema';
type TransformCoordinate = (coord: number[]) => number[];
/**
 * Apply transformation to every coordinate of binary features
 * @param  binaryFeatures binary features
 * @param  transformCoordinate Function to call on each coordinate
 * @return Transformed binary features
 */
export declare function transformBinaryCoords(binaryFeatures: BinaryFeatures, transformCoordinate: TransformCoordinate): BinaryFeatures;
/**
 * Apply transformation to every coordinate of GeoJSON features
 *
 * @param  features Array of GeoJSON features
 * @param  fn       Function to call on each coordinate
 * @return          Transformed GeoJSON features
 */
export declare function transformGeoJsonCoords(features: object[], fn: (coord: number[]) => number[]): object[];
export {};
//# sourceMappingURL=transform.d.ts.map