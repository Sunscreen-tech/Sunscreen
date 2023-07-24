import type { GeoJSONTileFeature } from './tile';
/**
 * Options for wrap()
 */
export type WrapOptions = {
    buffer: number /** number of pixels of buffer for the tile */;
    extent: number /** extent of each tile */;
    lineMetrics: boolean;
};
/**
 * Wrap across antemeridian, by clipping into two tiles, shifting the overflowing x coordinates
 * @param features list of features to be wrapped
 * @param options buffer and extent
 * @returns
 */
export declare function wrap(features: GeoJSONTileFeature[], options: WrapOptions): GeoJSONTileFeature[];
//# sourceMappingURL=wrap.d.ts.map