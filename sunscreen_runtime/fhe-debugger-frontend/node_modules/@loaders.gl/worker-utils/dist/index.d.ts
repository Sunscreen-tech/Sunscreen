import type { WorkerObject } from './types';
export type { WorkerObject, WorkerOptions, WorkerMessage, WorkerMessageType, WorkerMessageData, WorkerMessagePayload } from './types';
export { assert } from './lib/env-utils/assert';
export { isBrowser, isWorker } from './lib/env-utils/globals';
export { default as WorkerJob } from './lib/worker-farm/worker-job';
export { default as WorkerThread } from './lib/worker-farm/worker-thread';
export { default as WorkerFarm } from './lib/worker-farm/worker-farm';
export { default as WorkerPool } from './lib/worker-farm/worker-pool';
export { default as WorkerBody } from './lib/worker-farm/worker-body';
export { processOnWorker, canProcessOnWorker } from './lib/worker-api/process-on-worker';
export { createWorker } from './lib/worker-api/create-worker';
export { getWorkerURL } from './lib/worker-api/get-worker-url';
export { validateWorkerVersion } from './lib/worker-api/validate-worker-version';
export { getTransferList, getTransferListForWriter } from './lib/worker-utils/get-transfer-list';
export { getLibraryUrl, loadLibrary } from './lib/library-utils/library-utils';
export { default as AsyncQueue } from './lib/async-queue/async-queue';
export { default as ChildProcessProxy } from './lib/process-utils/child-process-proxy';
/** A null worker to test that worker processing is functional */
export declare const NullWorker: WorkerObject;
//# sourceMappingURL=index.d.ts.map