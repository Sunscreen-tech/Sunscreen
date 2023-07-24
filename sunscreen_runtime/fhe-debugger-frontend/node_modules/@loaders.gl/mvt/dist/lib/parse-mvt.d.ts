import type { Feature, BinaryFeatures, GeoJSONRowTable } from '@loaders.gl/schema';
import type { MVTLoaderOptions } from '../lib/types';
/**
 * Parse MVT arrayBuffer and return GeoJSON.
 *
 * @param arrayBuffer A MVT arrayBuffer
 * @param options
 * @returns A GeoJSON geometry object or a binary representation
 */
export default function parseMVT(arrayBuffer: ArrayBuffer, options?: MVTLoaderOptions): BinaryFeatures | GeoJSONRowTable | Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties>[] | {
    shape: string;
    data: BinaryFeatures;
};
//# sourceMappingURL=parse-mvt.d.ts.map