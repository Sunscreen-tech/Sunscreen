/**
 * Counter to register pending tile headers for the particular frameNumber
 * Until all tiles are loaded we won't call `onTraversalEnd` callback
 */
export declare class I3SPendingTilesRegister {
    private frameNumberMap;
    /**
     * Register a new pending tile header for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     */
    register(viewportId: string, frameNumber: number): void;
    /**
     * Deregister a pending tile header for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     */
    deregister(viewportId: string, frameNumber: number): void;
    /**
     * Check is there are no pending tile headers registered for the particular frameNumber
     * @param viewportId
     * @param frameNumber
     * @returns
     */
    isZero(viewportId: string, frameNumber: number): boolean;
}
//# sourceMappingURL=i3s-pending-tiles-register.d.ts.map