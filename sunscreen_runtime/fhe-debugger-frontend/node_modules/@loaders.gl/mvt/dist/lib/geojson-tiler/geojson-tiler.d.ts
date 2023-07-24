import type { GeoJSONTile, GeoJSONTileFeature } from './tile';
/** Options to configure tiling */
export type GeoJSONTilerOptions = {
    maxZoom?: number /** max zoom to preserve detail on */;
    indexMaxZoom?: number /** max zoom in the tile index */;
    indexMaxPoints?: number /** max number of points per tile in the tile index */;
    tolerance?: number /** simplification tolerance (higher means simpler) */;
    extent?: number /** tile extent */;
    buffer?: number /** tile buffer on each side */;
    lineMetrics?: boolean /** whether to calculate line metrics */;
    promoteId?: string /** name of a feature property to be promoted to feature.id */;
    generateId?: boolean /** whether to generate feature ids. Cannot be used with promoteId */;
    debug?: number /** logging level (0, 1 or 2) */;
};
export declare class GeoJSONTiler {
    options: Required<GeoJSONTilerOptions>;
    tiles: Record<string, GeoJSONTile>;
    tileCoords: {
        x: number;
        y: number;
        z: number;
    }[];
    stats: Record<string, number>;
    total: number;
    constructor(data: any, options?: GeoJSONTilerOptions);
    /**
     * Get a tile at the specified index
     * @param z
     * @param x
     * @param y
     * @returns
     */
    getTile(z: number, x: number, y: number): GeoJSONTile | null;
    /**
     * splits features from a parent tile to sub-tiles.
     * @param z, x, and y are the coordinates of the parent tile
     * @param cz, cx, and cy are the coordinates of the target tile
     *
     * If no target tile is specified, splitting stops when we reach the maximum
     * zoom or the number of points is low as specified in the options.
     */
    splitTile(features: GeoJSONTileFeature[], z: number, x: number, y: number, cz?: number, cx?: number, cy?: number): void;
}
//# sourceMappingURL=geojson-tiler.d.ts.map