import { Viewport } from '@deck.gl/core/typed';
import { Matrix4 } from '@math.gl/core';
import { Tile2DHeader } from './tile-2d-header';
import { TileIndex, ZRange } from './types';
import { TileLoadProps } from './types';
export declare const STRATEGY_NEVER = "never";
export declare const STRATEGY_REPLACE = "no-overlap";
export declare const STRATEGY_DEFAULT = "best-available";
export declare type RefinementStrategyFunction = (tiles: Tile2DHeader[]) => void;
export declare type RefinementStrategy = 'never' | 'no-overlap' | 'best-available' | RefinementStrategyFunction;
export declare type Tileset2DProps<DataT = any> = {
    /** `getTileData` is called to retrieve the data of each tile. */
    getTileData: (props: TileLoadProps) => Promise<DataT> | DataT;
    /** The bounding box of the layer's data. */
    extent?: number[] | null;
    /** The pixel dimension of the tiles, usually a power of 2. */
    tileSize?: number;
    /** The max zoom level of the layer's data. @default null */
    maxZoom?: number | null;
    /** The min zoom level of the layer's data. @default 0 */
    minZoom?: number | null;
    /** The maximum number of tiles that can be cached. */
    maxCacheSize?: number | null;
    /** The maximum memory used for caching tiles. @default null */
    maxCacheByteSize?: number | null;
    /** How the tile layer refines the visibility of tiles. @default 'best-available' */
    refinementStrategy?: RefinementStrategy;
    /** Range of minimum and maximum heights in the tile. */
    zRange?: ZRange | null;
    /** The maximum number of concurrent getTileData calls. @default 6 */
    maxRequests?: number;
    /** Changes the zoom level at which the tiles are fetched. Needs to be an integer. @default 0 */
    zoomOffset?: number;
    /** Called when a tile successfully loads. */
    onTileLoad?: (tile: Tile2DHeader<DataT>) => void;
    /** Called when a tile is cleared from cache. */
    onTileUnload?: (tile: Tile2DHeader<DataT>) => void;
    /** Called when a tile failed to load. */
    onTileError?: (err: any, tile: Tile2DHeader<DataT>) => void;
};
export declare const DEFAULT_TILESET2D_PROPS: Omit<Required<Tileset2DProps>, 'getTileData'>;
/**
 * Manages loading and purging of tile data. This class caches recently visited tiles
 * and only creates new tiles if they are present.
 */
export declare class Tileset2D {
    private opts;
    private _requestScheduler;
    private _cache;
    private _dirty;
    private _tiles;
    private _cacheByteSize;
    private _viewport;
    private _zRange?;
    private _selectedTiles;
    private _frameNumber;
    private _modelMatrix;
    private _modelMatrixInverse;
    private _maxZoom?;
    private _minZoom?;
    private onTileLoad;
    /**
     * Takes in a function that returns tile data, a cache size, and a max and a min zoom level.
     * Cache size defaults to 5 * number of tiles in the current viewport
     */
    constructor(opts: Tileset2DProps);
    get tiles(): Tile2DHeader<any>[];
    get selectedTiles(): Tile2DHeader[] | null;
    get isLoaded(): boolean;
    get needsReload(): boolean;
    setOptions(opts: Tileset2DProps): void;
    finalize(): void;
    reloadAll(): void;
    /**
     * Update the cache with the given viewport and model matrix and triggers callback onUpdate.
     */
    update(viewport: Viewport, { zRange, modelMatrix }?: {
        zRange?: ZRange;
        modelMatrix?: Matrix4;
    }): number;
    isTileVisible(tile: Tile2DHeader, cullRect?: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): boolean;
    /** Returns array of tile indices in the current viewport */
    getTileIndices({ viewport, maxZoom, minZoom, zRange, modelMatrix, modelMatrixInverse }: {
        viewport: Viewport;
        maxZoom?: number;
        minZoom?: number;
        zRange: ZRange | undefined;
        tileSize?: number;
        modelMatrix?: Matrix4;
        modelMatrixInverse?: Matrix4;
        zoomOffset?: number;
    }): TileIndex[];
    /** Returns unique string key for a tile index */
    getTileId(index: TileIndex): string;
    /** Returns a zoom level for a tile index */
    getTileZoom(index: TileIndex): number;
    /** Returns additional metadata to add to tile, bbox by default */
    getTileMetadata(index: TileIndex): Record<string, any>;
    /** Returns index of the parent tile */
    getParentIndex(index: TileIndex): {
        x: number;
        y: number;
        z: number;
    };
    private updateTileStates;
    private _getCullBounds;
    private _pruneRequests;
    private _rebuildTree;
    /**
     * Clear tiles that are not visible when the cache is full
     */
    private _resizeCache;
    private _getTile;
    _getNearestAncestor(tile: Tile2DHeader): Tile2DHeader | null;
}
//# sourceMappingURL=tileset-2d.d.ts.map