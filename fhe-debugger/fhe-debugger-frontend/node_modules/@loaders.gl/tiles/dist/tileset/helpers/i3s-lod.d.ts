import { Tile3D } from '../tile-3d';
import { FrameState } from './frame-state';
/**
 * For the maxScreenThreshold error metric, maxError means that you should replace the node with it's children
   as soon as the nodes bounding sphere has a screen radius larger than maxError pixels.
   In this sense a value of 0 means you should always load it's children,
   or if it's a leaf node, you should always display it.
 * @param tile
 * @param frameState
 * @returns
 */
export declare function getLodStatus(tile: Tile3D, frameState: FrameState): 'DIG' | 'OUT' | 'DRAW';
/**
 * Calculate size of MBS radius projected on the screen plane
 * @param tile
 * @param frameState
 * @returns
 */
export declare function getProjectedRadius(tile: Tile3D, frameState: FrameState): number;
//# sourceMappingURL=i3s-lod.d.ts.map