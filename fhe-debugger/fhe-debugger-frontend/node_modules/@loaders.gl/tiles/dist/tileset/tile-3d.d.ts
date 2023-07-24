import { Matrix4 } from '@math.gl/core';
import type { Tileset3D } from './tileset-3d';
import type { DoublyLinkedListNode } from '../utils/doubly-linked-list-node';
import { FrameState } from './helpers/frame-state';
import { CartographicBounds } from './helpers/bounding-volume';
import { TilesetTraverser } from './tileset-traverser';
/**
 * @param tileset - Tileset3D instance
 * @param header - tile header - JSON loaded from a dataset
 * @param parentHeader - parent Tile3D instance
 * @param extendedId - optional ID to separate copies of a tile for different viewports.
 *                              const extendedId = `${tile.id}-${frameState.viewport.id}`;
 */
export type Tile3DProps = {
    tileset: Tileset3D;
    header: Object;
    parentHeader: Tile3D;
    extendedId: string;
};
/**
 * A Tile3DHeader represents a tile as Tileset3D. When a tile is first created, its content is not loaded;
 * the content is loaded on-demand when needed based on the view.
 * Do not construct this directly, instead access tiles through {@link Tileset3D#tileVisible}.
 */
export declare class Tile3D {
    tileset: Tileset3D;
    header: any;
    id: string;
    url: string;
    parent: Tile3D;
    refine: number;
    type: string;
    contentUrl: string;
    /** Different refinement algorithms used by I3S and 3D tiles */
    lodMetricType: 'geometricError' | 'maxScreenThreshold';
    /** The error, in meters, introduced if this tile is rendered and its children are not. */
    lodMetricValue: number;
    /** @todo math.gl is not exporting BoundingVolume base type? */
    boundingVolume: any;
    /**
     * The tile's content.  This represents the actual tile's payload,
     * not the content's metadata in the tileset JSON file.
     */
    content: any;
    contentState: number;
    gpuMemoryUsageInBytes: number;
    /** The tile's children - an array of Tile3D objects. */
    children: Tile3D[];
    depth: number;
    viewportIds: any[];
    transform: Matrix4;
    extensions: any;
    /** TODO Cesium 3d tiles specific */
    implicitTiling?: any;
    /** Container to store application specific data */
    userData: Record<string, any>;
    computedTransform: any;
    hasEmptyContent: boolean;
    hasTilesetContent: boolean;
    traverser: TilesetTraverser;
    /** Used by TilesetCache */
    _cacheNode: DoublyLinkedListNode | null;
    private _frameNumber;
    private _expireDate;
    private _expiredContent;
    private _boundingBox?;
    /** updated every frame for tree traversal and rendering optimizations: */
    _distanceToCamera: number;
    _screenSpaceError: number;
    private _visibilityPlaneMask;
    private _visible;
    private _contentBoundingVolume;
    private _viewerRequestVolume;
    _initialTransform: Matrix4;
    _priority: number;
    _selectedFrame: number;
    _requestedFrame: number;
    _selectionDepth: number;
    _touchedFrame: number;
    _centerZDepth: number;
    _shouldRefine: boolean;
    _stackLength: number;
    _visitedFrame: number;
    _inRequestVolume: boolean;
    _lodJudge: any;
    /**
     * @constructs
     * Create a Tile3D instance
     * @param tileset - Tileset3D instance
     * @param header - tile header - JSON loaded from a dataset
     * @param parentHeader - parent Tile3D instance
     * @param extendedId - optional ID to separate copies of a tile for different viewports.
     *    const extendedId = `${tile.id}-${frameState.viewport.id}`;
     */
    constructor(tileset: Tileset3D, header: {
        [key: string]: any;
    }, parentHeader?: Tile3D, extendedId?: string);
    destroy(): void;
    isDestroyed(): boolean;
    get selected(): boolean;
    get isVisible(): boolean | undefined;
    get isVisibleAndInRequestVolume(): boolean | undefined;
    /** Returns true if tile is not an empty tile and not an external tileset */
    get hasRenderContent(): boolean;
    /** Returns true if tile has children */
    get hasChildren(): any;
    /**
     * Determines if the tile's content is ready. This is automatically `true` for
     * tiles with empty content.
     */
    get contentReady(): boolean;
    /**
     * Determines if the tile has available content to render.  `true` if the tile's
     * content is ready or if it has expired content this renders while new content loads; otherwise,
     */
    get contentAvailable(): boolean;
    /** Returns true if tile has renderable content but it's unloaded */
    get hasUnloadedContent(): boolean;
    /**
     * Determines if the tile's content has not be requested. `true` if tile's
     * content has not be requested; otherwise, `false`.
     */
    get contentUnloaded(): boolean;
    /**
     * Determines if the tile's content is expired. `true` if tile's
     * content is expired; otherwise, `false`.
     */
    get contentExpired(): boolean;
    get contentFailed(): boolean;
    /**
     * Distance from the tile's bounding volume center to the camera
     */
    get distanceToCamera(): number;
    /**
     * Screen space error for LOD selection
     */
    get screenSpaceError(): number;
    /**
     * Get bounding box in cartographic coordinates
     * @returns [min, max] each in [longitude, latitude, altitude]
     */
    get boundingBox(): CartographicBounds;
    /** Get the tile's screen space error. */
    getScreenSpaceError(frameState: any, useParentLodMetric: any): number;
    /**
     * Make tile unselected than means it won't be shown
     * but it can be still loaded in memory
     */
    unselect(): void;
    /**
     * Memory usage of tile on GPU
     */
    _getGpuMemoryUsageInBytes(): number;
    _getPriority(): number;
    /**
     *  Requests the tile's content.
     * The request may not be made if the Request Scheduler can't prioritize it.
     */
    loadContent(): Promise<boolean>;
    unloadContent(): boolean;
    /**
     * Update the tile's visibility
     * @param {Object} frameState - frame state for tile culling
     * @param {string[]} viewportIds - a list of viewport ids that show this tile
     * @return {void}
     */
    updateVisibility(frameState: any, viewportIds: any): void;
    visibility(frameState: any, parentVisibilityPlaneMask: any): any;
    contentVisibility(): boolean;
    /**
     * Computes the (potentially approximate) distance from the closest point of the tile's bounding volume to the camera.
     * @param frameState The frame state.
     * @returns {Number} The distance, in meters, or zero if the camera is inside the bounding volume.
     */
    distanceToTile(frameState: FrameState): number;
    /**
     * Computes the tile's camera-space z-depth.
     * @param frameState The frame state.
     * @returns The distance, in meters.
     */
    cameraSpaceZDepth({ camera }: {
        camera: any;
    }): number;
    /**
     * Checks if the camera is inside the viewer request volume.
     * @param {FrameState} frameState The frame state.
     * @returns {Boolean} Whether the camera is inside the volume.
     */
    insideViewerRequestVolume(frameState: FrameState): boolean;
    updateExpiration(): void;
    get extras(): any;
    _initializeLodMetric(header: any): void;
    _initializeTransforms(tileHeader: any): void;
    _initializeBoundingVolumes(tileHeader: any): void;
    _initializeContent(tileHeader: any): void;
    _initializeRenderingState(header: any): void;
    _getRefine(refine: any): any;
    _isTileset(): boolean;
    _onContentLoaded(): void;
    _updateBoundingVolume(header: any): void;
    _updateTransform(parentTransform?: Matrix4): void;
    _getLoaderSpecificOptions(loaderId: any): {
        assetGltfUpAxis: "X" | "Y" | "Z";
    } | {
        _tileOptions: {
            attributeUrls: any;
            textureUrl: any;
            textureFormat: any;
            textureLoaderOptions: any;
            materialDefinition: any;
            isDracoGeometry: any;
            mbs: any;
        };
        _tilesetOptions: {
            store: any;
            attributeStorageInfo: any;
            fields: any;
        };
        isTileHeader: boolean;
    };
}
//# sourceMappingURL=tile-3d.d.ts.map