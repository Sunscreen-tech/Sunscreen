import type { WorkerObject, WorkerOptions, WorkerContext } from '../../types';
type ProcessOnWorkerOptions = WorkerOptions & {
    jobName?: string;
    [key: string]: any;
};
/**
 * Determines if we can parse with worker
 * @param loader
 * @param data
 * @param options
 */
export declare function canProcessOnWorker(worker: WorkerObject, options?: WorkerOptions): boolean | "" | undefined;
/**
 * This function expects that the worker thread sends certain messages,
 * Creating such a worker can be automated if the worker is wrapper by a call to
 * createWorker in @loaders.gl/worker-utils.
 */
export declare function processOnWorker(worker: WorkerObject, data: any, options?: ProcessOnWorkerOptions, context?: WorkerContext): Promise<any>;
export {};
//# sourceMappingURL=process-on-worker.d.ts.map