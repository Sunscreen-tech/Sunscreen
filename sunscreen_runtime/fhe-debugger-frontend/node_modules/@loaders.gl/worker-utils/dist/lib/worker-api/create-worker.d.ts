import type { WorkerContext, Process, ProcessInBatches } from '../../types';
export type ProcessOnMainThread = (data: any, options?: {
    [key: string]: any;
}, context?: WorkerContext) => any;
/**
 * Set up a WebWorkerGlobalScope to talk with the main thread
 */
export declare function createWorker(process: Process, processInBatches?: ProcessInBatches): void;
//# sourceMappingURL=create-worker.d.ts.map