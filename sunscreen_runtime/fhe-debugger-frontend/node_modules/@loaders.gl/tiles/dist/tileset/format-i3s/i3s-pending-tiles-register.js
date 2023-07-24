"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I3SPendingTilesRegister = void 0;
/**
 * Counter to register pending tile headers for the particular frameNumber
 * Until all tiles are loaded we won't call `onTraversalEnd` callback
 */
class I3SPendingTilesRegister {
    constructor() {
        this.frameNumberMap = new Map();
    }
    /**
     * Register a new pending tile header for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     */
    register(viewportId, frameNumber) {
        const viewportMap = this.frameNumberMap.get(viewportId) || new Map();
        const oldCount = viewportMap.get(frameNumber) || 0;
        viewportMap.set(frameNumber, oldCount + 1);
        this.frameNumberMap.set(viewportId, viewportMap);
    }
    /**
     * Deregister a pending tile header for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     */
    deregister(viewportId, frameNumber) {
        const viewportMap = this.frameNumberMap.get(viewportId);
        if (!viewportMap) {
            return;
        }
        const oldCount = viewportMap.get(frameNumber) || 1;
        viewportMap.set(frameNumber, oldCount - 1);
    }
    /**
     * Check is there are no pending tile headers registered for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     * @returns
     */
    isZero(viewportId, frameNumber) {
        const count = this.frameNumberMap.get(viewportId)?.get(frameNumber) || 0;
        return count === 0;
    }
}
exports.I3SPendingTilesRegister = I3SPendingTilesRegister;
