import Protobuf from 'pbf';
import { FlatIndexedGeometry, FlatPolygon } from '@loaders.gl/schema';
import VectorTileFeature from '../lib/binary-vector-tile/vector-tile-feature';
/**
 * Classifies an array of rings into polygons with outer rings and holes
 * The function also detects holes which have zero area and
 * removes them. In doing so it modifies the input
 * `geom.data` array to remove the unneeded data
 *
 * @param geometry
 * @returns object
 */
export declare function classifyRings(geom: FlatIndexedGeometry): FlatPolygon;
/**
 *
 * @param data
 * @param x0
 * @param y0
 * @param size
 */
export declare function project(data: number[], x0: number, y0: number, size: number): void;
/**
 * All code below is unchanged from the original Mapbox implemenation
 *
 * @param tag
 * @param feature
 * @param pbf
 */
export declare function readFeature(tag: number, feature?: VectorTileFeature, pbf?: Protobuf): void;
/**
 * @param pbf
 * @param feature
 */
export declare function readTag(pbf: Protobuf, feature: VectorTileFeature): void;
//# sourceMappingURL=binary-util-functions.d.ts.map