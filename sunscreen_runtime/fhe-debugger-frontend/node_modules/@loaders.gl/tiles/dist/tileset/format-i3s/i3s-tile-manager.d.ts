import { FrameState } from '../helpers/frame-state';
export declare class I3STileManager {
    private _statusMap;
    private pendingTilesRegister;
    constructor();
    /**
     * Add request to map
     * @param request - node metadata request
     * @param key - unique key
     * @param callback - callback after request completed
     * @param frameState - frameState data
     */
    add(request: any, key: any, callback: any, frameState: FrameState): void;
    /**
     * Update request if it is still actual for the new frameState
     * @param key - unique key
     * @param frameState - frameState data
     */
    update(key: any, frameState: FrameState): void;
    /**
     * Find request in the map
     * @param key - unique key
     * @returns
     */
    find(key: any): any;
    /**
     * Check it there are pending tile headers for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     * @returns
     */
    hasPendingTiles(viewportId: string, frameNumber: number): boolean;
}
//# sourceMappingURL=i3s-tile-manager.d.ts.map