export type GeoJSONTileFeature = {
    type: any;
    geometry: any;
    id?: string;
    tags?: string[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};
export type GeoJSONTile = {
    features: GeoJSONTileFeature[];
    type?: number;
    tags?: Record<string, string>;
    x: number;
    y: number;
    z: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    transformed: boolean;
    numPoints: number;
    numSimplified: number;
    numFeatures: number;
    source: any | null;
};
export type CreateTileOptions = {
    maxZoom?: number;
    tolerance: number;
    extent: number;
    lineMetrics: boolean;
};
/**
 * Create a tile from features and tile index
 */
export declare function createTile(features: any[], z: any, tx: any, ty: any, options: CreateTileOptions): GeoJSONTile;
//# sourceMappingURL=tile.d.ts.map