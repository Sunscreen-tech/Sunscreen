import type { BinaryGeometry, BinaryFeatures, BinaryGeometryType } from '@loaders.gl/schema';
import type { Feature, Geometry } from '@loaders.gl/schema';
type BinaryToGeoJsonOptions = {
    type?: BinaryGeometryType;
    globalFeatureId?: number;
};
/**
 * Convert binary geometry representation to GeoJSON
 * @param data   geometry data in binary representation
 * @param options
 * @param options.type  Input data type: Point, LineString, or Polygon
 * @param options.featureId  Global feature id. If specified, only a single feature is extracted
 * @return GeoJSON objects
 */
export declare function binaryToGeojson(data: BinaryFeatures, options?: BinaryToGeoJsonOptions): Feature[] | Feature;
/** @deprecated use `binaryToGeojson` or `binaryToGeometry` instead */
export declare function binaryToGeoJson(data: BinaryGeometry | BinaryFeatures, type?: BinaryGeometryType, format?: 'feature' | 'geometry'): Geometry | Feature[];
/** Parse input binary data and return a valid GeoJSON geometry object */
export declare function binaryToGeometry(data: BinaryGeometry, startIndex?: number, endIndex?: number): Geometry;
export {};
//# sourceMappingURL=binary-to-geojson.d.ts.map