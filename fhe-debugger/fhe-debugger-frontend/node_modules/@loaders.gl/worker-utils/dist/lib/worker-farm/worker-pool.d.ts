import type { WorkerMessageType, WorkerMessagePayload } from '../../types';
import WorkerThread from './worker-thread';
import WorkerJob from './worker-job';
/** WorkerPool onDebug Callback Parameters */
type OnDebugParameters = {
    message: string;
    worker: string;
    name: string;
    job: string;
    backlog: number;
    workerThread: WorkerThread;
};
/** WorkerPool Properties */
export type WorkerPoolProps = {
    name?: string;
    source?: string;
    url?: string;
    maxConcurrency?: number;
    maxMobileConcurrency?: number;
    onDebug?: (options: OnDebugParameters) => any;
    reuseWorkers?: boolean;
};
/** Private helper types */
type OnMessage = (job: WorkerJob, type: WorkerMessageType, payload: WorkerMessagePayload) => void;
type OnError = (job: WorkerJob, error: Error) => void;
/**
 * Process multiple data messages with small pool of identical workers
 */
export default class WorkerPool {
    name: string;
    source?: string;
    url?: string;
    maxConcurrency: number;
    maxMobileConcurrency: number;
    onDebug: (options: OnDebugParameters) => any;
    reuseWorkers: boolean;
    private props;
    private jobQueue;
    private idleQueue;
    private count;
    private isDestroyed;
    /** Checks if workers are supported on this platform */
    static isSupported(): boolean;
    /**
     * @param processor - worker function
     * @param maxConcurrency - max count of workers
     */
    constructor(props: WorkerPoolProps);
    /**
     * Terminates all workers in the pool
     * @note Can free up significant memory
     */
    destroy(): void;
    setProps(props: WorkerPoolProps): void;
    startJob(name: string, onMessage?: OnMessage, onError?: OnError): Promise<WorkerJob>;
    /**
     * Starts first queued job if worker is available or can be created
     * Called when job is started and whenever a worker returns to the idleQueue
     */
    _startQueuedJob(): Promise<void>;
    /**
     * Returns a worker to the idle queue
     * Destroys the worker if
     *  - pool is destroyed
     *  - if this pool doesn't reuse workers
     *  - if maxConcurrency has been lowered
     * @param worker
     */
    returnWorkerToQueue(worker: WorkerThread): void;
    /**
     * Returns idle worker or creates new worker if maxConcurrency has not been reached
     */
    _getAvailableWorker(): WorkerThread | null;
    _getMaxConcurrency(): number;
}
export {};
//# sourceMappingURL=worker-pool.d.ts.map