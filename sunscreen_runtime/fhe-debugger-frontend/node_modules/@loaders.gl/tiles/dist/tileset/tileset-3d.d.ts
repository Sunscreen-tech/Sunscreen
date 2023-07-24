import { Matrix4, Vector3 } from '@math.gl/core';
import { Stats } from '@probe.gl/stats';
import { RequestScheduler, LoaderWithParser, LoaderOptions } from '@loaders.gl/loader-utils';
import { TilesetCache } from './tileset-cache';
import { FrameState } from './helpers/frame-state';
import type { Viewport } from '../types';
import { Tile3D } from './tile-3d';
import { TilesetTraverser } from './tileset-traverser';
export type TilesetJSON = any;
export type Tileset3DProps = {
    throttleRequests?: boolean;
    maxRequests?: number;
    loadOptions?: LoaderOptions;
    loadTiles?: boolean;
    basePath?: string;
    maximumMemoryUsage?: number;
    maximumTilesSelected?: number;
    debounceTime?: number;
    description?: string;
    attributions?: string[];
    ellipsoid?: object;
    modelMatrix?: Matrix4;
    maximumScreenSpaceError?: number;
    viewportTraversersMap?: any;
    updateTransforms?: boolean;
    viewDistanceScale?: number;
    onTileLoad?: (tile: Tile3D) => any;
    onTileUnload?: (tile: Tile3D) => any;
    onTileError?: (tile: Tile3D, message: string, url: string) => any;
    contentLoader?: (tile: Tile3D) => Promise<void>;
    onTraversalComplete?: (selectedTiles: Tile3D[]) => Tile3D[];
};
type Props = {
    description: string;
    ellipsoid: object;
    /** A 4x4 transformation matrix this transforms the entire tileset. */
    modelMatrix: Matrix4;
    /** Set to false to disable network request throttling */
    throttleRequests: boolean;
    /** Number of simultaneous requsts, if throttleRequests is true */
    maxRequests: number;
    maximumMemoryUsage: number;
    /** Maximum number limit of tiles selected for show. 0 means no limit */
    maximumTilesSelected: number;
    /** Delay time before the tileset traversal. It prevents traversal requests spam.*/
    debounceTime: number;
    /** Callback. Indicates this a tile's content was loaded */
    onTileLoad: (tile: Tile3D) => void;
    /** Callback. Indicates this a tile's content was unloaded (cache full) */
    onTileUnload: (tile: Tile3D) => void;
    /** Callback. Indicates this a tile's content failed to load */
    onTileError: (tile: Tile3D, message: string, url: string) => void;
    /** Callback. Allows post-process selectedTiles right after traversal. */
    onTraversalComplete: (selectedTiles: Tile3D[]) => Tile3D[];
    /** The maximum screen space error used to drive level of detail refinement. */
    maximumScreenSpaceError: number;
    viewportTraversersMap: Record<string, any> | null;
    attributions: string[];
    loadTiles: boolean;
    loadOptions: LoaderOptions;
    updateTransforms: boolean;
    /** View distance scale modifier */
    viewDistanceScale: number;
    basePath: string;
    /** Optional async tile content loader */
    contentLoader?: (tile: Tile3D) => Promise<void>;
    /** @todo I3S specific knowledge should be moved to I3S module */
    i3s: Record<string, any>;
};
/**
 * The Tileset loading and rendering flow is as below,
 * A rendered (i.e. deck.gl `Tile3DLayer`) triggers `tileset.update()` after a `tileset` is loaded
 * `tileset` starts traversing the tile tree and update `requestTiles` (tiles of which content need
 * to be fetched) and `selectedTiles` (tiles ready for rendering under the current viewport).
 * `Tile3DLayer` will update rendering based on `selectedTiles`.
 * `Tile3DLayer` also listens to `onTileLoad` callback and trigger another round of `update and then traversal`
 * when new tiles are loaded.

 * As I3S tileset have stored `tileHeader` file (metadata) and tile content files (geometry, texture, ...) separately.
 * During each traversal, it issues `tilHeader` requests if that `tileHeader` is not yet fetched,
 * after the tile header is fulfilled, it will resume the traversal starting from the tile just fetched (not root).

 * Tile3DLayer
 *      |
 *  await load(tileset)
 *      |
 *  tileset.update()
 *      |                async load tileHeader
 *  tileset.traverse() -------------------------- Queued
 *      |        resume traversal after fetched  |
 *      |----------------------------------------|
 *      |
 *      |                     async load tile content
 * tilset.requestedTiles  ----------------------------- RequestScheduler
 *                                                             |
 * tilset.selectedTiles (ready for rendering)                  |
 *      |         Listen to                                    |
 *   Tile3DLayer ----------- onTileLoad  ----------------------|
 *      |                         |   notify new tile is available
 *   updateLayers                 |
 *                       tileset.update // trigger another round of update
*/
export declare class Tileset3D {
    options: Props;
    loadOptions: LoaderOptions;
    type: string;
    tileset: TilesetJSON;
    loader: LoaderWithParser;
    url: string;
    basePath: string;
    modelMatrix: Matrix4;
    ellipsoid: any;
    lodMetricType: string;
    lodMetricValue: number;
    refine: string;
    root: Tile3D | null;
    roots: Record<string, Tile3D>;
    /** @todo any->unknown */
    asset: Record<string, any>;
    description: string;
    properties: any;
    extras: any;
    attributions: any;
    credits: any;
    stats: Stats;
    /** flags that contain information about data types in nested tiles */
    contentFormats: {
        draco: boolean;
        meshopt: boolean;
        dds: boolean;
        ktx2: boolean;
    };
    cartographicCenter: Vector3 | null;
    cartesianCenter: Vector3 | null;
    zoom: number;
    boundingVolume: any;
    /** Updated based on the camera position and direction */
    dynamicScreenSpaceErrorComputedDensity: number;
    /**
     * The maximum amount of GPU memory (in MB) that may be used to cache tiles
     * Tiles not in view are unloaded to enforce private
     */
    maximumMemoryUsage: number;
    /** The total amount of GPU memory in bytes used by the tileset. */
    gpuMemoryUsageInBytes: number;
    /** Update tracker. increase in each update cycle. */
    _frameNumber: number;
    private _queryParams;
    private _extensionsUsed;
    private _tiles;
    /** counter for tracking tiles requests */
    private _pendingCount;
    /** Hold traversal results */
    selectedTiles: Tile3D[];
    traverseCounter: number;
    geometricError: number;
    private lastUpdatedVieports;
    private _requestedTiles;
    private _emptyTiles;
    private frameStateData;
    _traverser: TilesetTraverser;
    _cache: TilesetCache;
    _requestScheduler: RequestScheduler;
    private updatePromise;
    tilesetInitializationPromise: Promise<void>;
    /**
     * Create a new Tileset3D
     * @param json
     * @param props
     */
    constructor(tileset: TilesetJSON, options?: Tileset3DProps);
    /** Release resources */
    destroy(): void;
    /** Is the tileset loaded (update needs to have been called at least once) */
    isLoaded(): boolean;
    get tiles(): object[];
    get frameNumber(): number;
    get queryParams(): string;
    setProps(props: Tileset3DProps): void;
    /** @deprecated */
    setOptions(options: Tileset3DProps): void;
    /**
     * Return a loadable tile url for a specific tile subpath
     * @param tilePath a tile subpath
     */
    getTileUrl(tilePath: string): string;
    hasExtension(extensionName: string): boolean;
    /**
     * Update visible tiles relying on a list of viewports
     * @param viewports - list of viewports
     * @deprecated
     */
    update(viewports?: Viewport[] | Viewport | null): void;
    /**
     * Update visible tiles relying on a list of viewports.
     * Do it with debounce delay to prevent update spam
     * @param viewports viewports
     * @returns Promise of new frameNumber
     */
    selectTiles(viewports?: Viewport[] | Viewport | null): Promise<number>;
    /**
     * Update visible tiles relying on a list of viewports
     * @param viewports viewports
     */
    private doUpdate;
    /**
     * Check if traversal is needed for particular viewport
     * @param {string} viewportId - id of a viewport
     * @return {boolean}
     */
    _needTraverse(viewportId: string): boolean;
    /**
     * The callback to post-process tiles after traversal procedure
     * @param frameState - frame state for tile culling
     */
    _onTraversalEnd(frameState: FrameState): void;
    /**
     * Update tiles relying on data from all traversers
     */
    _updateTiles(): void;
    _tilesChanged(oldSelectedTiles: Tile3D[], selectedTiles: Tile3D[]): boolean;
    _loadTiles(): void;
    _unloadTiles(): void;
    _updateStats(): void;
    _initializeTileSet(tilesetJson: TilesetJSON): Promise<void>;
    /**
     * Called during initialize Tileset to initialize the tileset's cartographic center (longitude, latitude) and zoom.
     * These metrics help apps center view on tileset
     * For I3S there is extent (<1.8 version) or fullExtent (>=1.8 version) to calculate view props
     * @returns
     */
    private calculateViewPropsI3S;
    /**
     * Called during initialize Tileset to initialize the tileset's cartographic center (longitude, latitude) and zoom.
     * These metrics help apps center view on tileset.
     * For 3DTiles the root tile data is used to calculate view props.
     * @returns
     */
    private calculateViewPropsTiles3D;
    _initializeStats(): void;
    _initializeTileHeaders(tilesetJson: TilesetJSON, parentTileHeader?: any): Tile3D;
    _initializeTraverser(): TilesetTraverser;
    _destroyTileHeaders(parentTile: Tile3D): void;
    _loadTile(tile: Tile3D): Promise<void>;
    _onTileLoadError(tile: Tile3D, error: Error): void;
    _onTileLoad(tile: Tile3D, loaded: boolean): void;
    /**
     * Update information about data types in nested tiles
     * @param tile instance of a nested Tile3D
     */
    private updateContentTypes;
    _onStartTileLoading(): void;
    _onEndTileLoading(): void;
    _addTileToCache(tile: Tile3D): void;
    _updateCacheStats(tile: any): void;
    _unloadTile(tile: any): void;
    _destroy(): void;
    _destroySubtree(tile: any): void;
    _destroyTile(tile: any): void;
    _initializeTiles3DTileset(tilesetJson: any): void;
    _initializeI3STileset(): void;
}
export {};
//# sourceMappingURL=tileset-3d.d.ts.map