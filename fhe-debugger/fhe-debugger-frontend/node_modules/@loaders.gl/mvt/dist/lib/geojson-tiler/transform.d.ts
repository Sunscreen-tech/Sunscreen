import type { GeoJSONTile } from './tile';
/**
 * Transforms the coordinates of each feature in the given tile from
 * mercator-projected space into (extent x extent) tile space.
 */
export declare function transformTile(tile: GeoJSONTile, extent: number): GeoJSONTile;
//# sourceMappingURL=transform.d.ts.map