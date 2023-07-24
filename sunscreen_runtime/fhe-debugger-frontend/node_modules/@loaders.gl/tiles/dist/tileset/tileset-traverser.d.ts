import type { Tile3D } from './tile-3d';
import { ManagedArray } from '../utils/managed-array';
import { FrameState } from './helpers/frame-state';
export type TilesetTraverserProps = {
    loadSiblings?: boolean;
    skipLevelOfDetail?: boolean;
    updateTransforms?: boolean;
    maximumScreenSpaceError?: number;
    onTraversalEnd?: (frameState: any) => any;
    viewportTraversersMap?: Record<string, any>;
    basePath?: string;
};
export declare const DEFAULT_PROPS: Required<TilesetTraverserProps>;
export declare class TilesetTraverser {
    options: Required<TilesetTraverserProps>;
    root: any;
    selectedTiles: Record<string, Tile3D>;
    requestedTiles: Record<string, Tile3D>;
    emptyTiles: Record<string, Tile3D>;
    protected lastUpdate: number;
    protected readonly updateDebounceTime = 1000;
    /** temporary storage to hold the traversed tiles during a traversal */
    protected _traversalStack: ManagedArray;
    protected _emptyTraversalStack: ManagedArray;
    /** set in every traverse cycle */
    protected _frameNumber: number | null;
    protected traversalFinished(frameState: FrameState): boolean;
    constructor(options: TilesetTraverserProps);
    traverse(root: any, frameState: any, options: any): void;
    reset(): void;
    /**
     * Execute traverse
     * Depth-first traversal that traverses all visible tiles and marks tiles for selection.
     * If skipLevelOfDetail is off then a tile does not refine until all children are loaded.
     * This is the traditional replacement refinement approach and is called the base traversal.
     * Tiles that have a greater screen space error than the base screen space error are part of the base traversal,
     * all other tiles are part of the skip traversal. The skip traversal allows for skipping levels of the tree
     * and rendering children and parent tiles simultaneously.
     */
    executeTraversal(root: any, frameState: FrameState): void;
    updateChildTiles(tile: Tile3D, frameState: FrameState): void;
    updateAndPushChildren(tile: Tile3D, frameState: FrameState, stack: any, depth: any): boolean;
    updateTile(tile: Tile3D, frameState: FrameState): void;
    selectTile(tile: Tile3D, frameState: FrameState): void;
    loadTile(tile: Tile3D, frameState: FrameState): void;
    touchTile(tile: Tile3D, frameState: FrameState): void;
    canTraverse(tile: Tile3D, frameState: FrameState, useParentMetric?: boolean, ignoreVisibility?: boolean): boolean;
    shouldLoadTile(tile: Tile3D): boolean;
    shouldSelectTile(tile: Tile3D): boolean;
    /** Decide if tile LoD (level of detail) is not sufficient under current viewport */
    shouldRefine(tile: Tile3D, frameState: FrameState, useParentMetric?: boolean): boolean;
    updateTileVisibility(tile: Tile3D, frameState: FrameState): void;
    compareDistanceToCamera(b: Tile3D, a: Tile3D): number;
    anyChildrenVisible(tile: Tile3D, frameState: FrameState): boolean;
    executeEmptyTraversal(root: Tile3D, frameState: FrameState): boolean;
}
//# sourceMappingURL=tileset-traverser.d.ts.map