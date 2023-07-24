import type { GeoJSONTileFeature } from './tile';
/**
 * Clip features between two vertical or horizontal axis-parallel lines:
 *     |        |
 *  ___|___     |     /
 * /   |   \____|____/
 *     |        |
 *
 * @param k1 and k2 are the line coordinates
 * @param axis: 0 for x, 1 for y
 * @param minAll and maxAll: minimum and maximum coordinate value for all features
 */
export declare function clip(features: GeoJSONTileFeature[], scale: number, k1: number, k2: number, axis: any, minAll: number, maxAll: number, options: {
    lineMetrics: boolean;
}): GeoJSONTileFeature[] | null;
//# sourceMappingURL=clip.d.ts.map