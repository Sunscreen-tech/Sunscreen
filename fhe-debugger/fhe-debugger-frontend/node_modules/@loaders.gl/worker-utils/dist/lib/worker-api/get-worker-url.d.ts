import type { WorkerObject, WorkerOptions } from '../../types';
/**
 * Gets worker object's name (for debugging in Chrome thread inspector window)
 */
export declare function getWorkerName(worker: WorkerObject): string;
/**
 * Generate a worker URL based on worker object and options
 * @returns A URL to one of the following:
 * - a published worker on unpkg CDN
 * - a local test worker
 * - a URL provided by the user in options
 */
export declare function getWorkerURL(worker: WorkerObject, options?: WorkerOptions): string;
//# sourceMappingURL=get-worker-url.d.ts.map