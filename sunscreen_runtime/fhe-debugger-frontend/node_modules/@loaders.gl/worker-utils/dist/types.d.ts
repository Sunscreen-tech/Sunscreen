/**
 * Worker Options
 */
export type WorkerOptions = {
    CDN?: string | null;
    worker?: boolean;
    maxConcurrency?: number;
    maxMobileConcurrency?: number;
    reuseWorkers?: boolean;
    _workerType?: string;
    workerUrl?: string;
    [key: string]: any;
};
export type WorkerContext = {
    process?: Process;
    processInBatches?: ProcessInBatches;
};
export type Process = (data: any, options?: {
    [key: string]: any;
}, context?: WorkerContext) => any;
export type ProcessInBatches = (iterator: AsyncIterable<any> | Iterable<any>, options?: {
    [key: string]: any;
}, context?: WorkerContext) => AsyncIterable<any>;
/**
 * A worker description object
 */
export type WorkerObject = {
    id: string;
    name: string;
    module: string;
    version: string;
    worker?: string | boolean;
    options: {
        [key: string]: any;
    };
    deprecatedOptions?: object;
    process?: Process;
    processInBatches?: ProcessInBatches;
};
export type WorkerMessageType = 'process' | 'done' | 'error' | 'process-in-batches' | 'input-batch' | 'input-done' | 'output-batch';
export type WorkerMessagePayload = {
    id?: number;
    options?: {
        [key: string]: any;
    };
    context?: {
        [key: string]: any;
    };
    input?: any;
    result?: any;
    error?: string;
};
export type WorkerMessageData = {
    source: 'loaders.gl';
    type: WorkerMessageType;
    payload: WorkerMessagePayload;
};
export type WorkerMessage = {
    type: string;
    data: WorkerMessageData;
};
//# sourceMappingURL=types.d.ts.map