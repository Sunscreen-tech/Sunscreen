import WorkerPool from './worker-pool';
/**
 * @param maxConcurrency - max count of workers
 * @param maxMobileConcurrency - max count of workers on mobile
 * @param maxConcurrency - max count of workers
 * @param reuseWorkers - if false, destroys workers when task is completed
 * @param onDebug - callback intended to allow application to log worker pool activity
 */
export type WorkerFarmProps = {
    maxConcurrency?: number;
    maxMobileConcurrency?: number;
    reuseWorkers?: boolean;
    onDebug?: () => void;
};
/**
 * Process multiple jobs with a "farm" of different workers in worker pools.
 */
export default class WorkerFarm {
    private props;
    private workerPools;
    private static _workerFarm?;
    /** Checks if workers are supported on this platform */
    static isSupported(): boolean;
    /** Get the singleton instance of the global worker farm */
    static getWorkerFarm(props?: WorkerFarmProps): WorkerFarm;
    /** get global instance with WorkerFarm.getWorkerFarm() */
    private constructor();
    /**
     * Terminate all workers in the farm
     * @note Can free up significant memory
     */
    destroy(): void;
    /**
     * Set props used when initializing worker pools
     * @param props
     */
    setProps(props: WorkerFarmProps): void;
    /**
     * Returns a worker pool for the specified worker
     * @param options - only used first time for a specific worker name
     * @param options.name - the name of the worker - used to identify worker pool
     * @param options.url -
     * @param options.source -
     * @example
     *   const job = WorkerFarm.getWorkerFarm().getWorkerPool({name, url}).startJob(...);
     */
    getWorkerPool(options: {
        name: string;
        source?: string;
        url?: string;
    }): WorkerPool;
    _getWorkerPoolProps(): {
        maxConcurrency: number | undefined;
        maxMobileConcurrency: number | undefined;
        reuseWorkers: boolean | undefined;
        onDebug: (() => void) | undefined;
    };
}
//# sourceMappingURL=worker-farm.d.ts.map