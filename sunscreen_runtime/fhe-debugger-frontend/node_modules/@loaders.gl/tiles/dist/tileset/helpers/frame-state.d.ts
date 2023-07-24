import { Tile3D } from '@loaders.gl/tiles';
import { CullingVolume } from '@math.gl/culling';
import { GeospatialViewport } from '../../types';
export type FrameState = {
    camera: {
        position: number[];
        direction: number[];
        up: number[];
    };
    viewport: GeospatialViewport;
    topDownViewport: GeospatialViewport;
    height: number;
    cullingVolume: CullingVolume;
    frameNumber: number;
    sseDenominator: number;
};
export declare function getFrameState(viewport: GeospatialViewport, frameNumber: number): FrameState;
/**
 * Limit `tiles` array length with `maximumTilesSelected` number.
 * The criteria for this filtering is distance of a tile center
 * to the `frameState.viewport`'s longitude and latitude
 * @param tiles - tiles array to filter
 * @param frameState - frameState to calculate distances
 * @param maximumTilesSelected - maximal amount of tiles in the output array
 * @returns new tiles array
 */
export declare function limitSelectedTiles(tiles: Tile3D[], frameState: FrameState, maximumTilesSelected: number): [Tile3D[], Tile3D[]];
//# sourceMappingURL=frame-state.d.ts.map