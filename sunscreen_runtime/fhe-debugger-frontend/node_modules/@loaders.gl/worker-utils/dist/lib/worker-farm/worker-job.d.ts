import type { WorkerMessageType, WorkerMessagePayload } from '../../types';
import WorkerThread from './worker-thread';
/**
 * Represents one Job handled by a WorkerPool or WorkerFarm
 */
export default class WorkerJob {
    readonly name: string;
    readonly workerThread: WorkerThread;
    isRunning: boolean;
    /** Promise that resolves when Job is done */
    readonly result: Promise<any>;
    private _resolve;
    private _reject;
    constructor(jobName: string, workerThread: WorkerThread);
    /**
     * Send a message to the job's worker thread
     * @param data any data structure, ideally consisting mostly of transferrable objects
     */
    postMessage(type: WorkerMessageType, payload: WorkerMessagePayload): void;
    /**
     * Call to resolve the `result` Promise with the supplied value
     */
    done(value: any): void;
    /**
     * Call to reject the `result` Promise with the supplied error
     */
    error(error: Error): void;
}
//# sourceMappingURL=worker-job.d.ts.map