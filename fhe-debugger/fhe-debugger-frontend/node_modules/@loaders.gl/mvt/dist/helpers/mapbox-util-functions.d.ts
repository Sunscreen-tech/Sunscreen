import Protobuf from 'pbf';
import { MVTMapboxGeometry } from '../lib/types';
import VectorTileFeature from '../lib/mapbox-vector-tile/vector-tile-feature';
/**
 * Classifies an array of rings into polygons with outer rings and holes
 * @param rings
 * @returns polygons
 */
export declare function classifyRings(rings: MVTMapboxGeometry): MVTMapboxGeometry[] | number[][][];
/**
 *
 * @param ring
 * @returns sum
 */
export declare function signedArea(ring: number[][]): number;
/**
 *
 * @param tag
 * @param feature
 * @param pbf
 */
export declare function readFeature(tag: number, feature?: VectorTileFeature, pbf?: Protobuf): void;
/**
 *
 * @param pbf
 * @param feature
 */
export declare function readTag(pbf: Protobuf, feature: VectorTileFeature): void;
//# sourceMappingURL=mapbox-util-functions.d.ts.map