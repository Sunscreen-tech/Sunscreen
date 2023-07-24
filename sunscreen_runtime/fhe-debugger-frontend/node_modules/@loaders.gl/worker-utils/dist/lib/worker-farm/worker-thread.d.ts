import { NodeWorkerType } from '../node/worker_threads';
export type WorkerThreadProps = {
    name: string;
    source?: string;
    url?: string;
};
/**
 * Represents one worker thread
 */
export default class WorkerThread {
    readonly name: string;
    readonly source: string | undefined;
    readonly url: string | undefined;
    terminated: boolean;
    worker: Worker | NodeWorkerType;
    onMessage: (message: any) => void;
    onError: (error: Error) => void;
    private _loadableURL;
    /** Checks if workers are supported on this platform */
    static isSupported(): boolean;
    constructor(props: WorkerThreadProps);
    /**
     * Terminate this worker thread
     * @note Can free up significant memory
     */
    destroy(): void;
    get isRunning(): boolean;
    /**
     * Send a message to this worker thread
     * @param data any data structure, ideally consisting mostly of transferrable objects
     * @param transferList If not supplied, calculated automatically by traversing data
     */
    postMessage(data: any, transferList?: any[]): void;
    /**
     * Generate a standard Error from an ErrorEvent
     * @param event
     */
    _getErrorFromErrorEvent(event: ErrorEvent): Error;
    /**
     * Creates a worker thread on the browser
     */
    _createBrowserWorker(): Worker;
    /**
     * Creates a worker thread in node.js
     * @todo https://nodejs.org/api/async_hooks.html#async-resource-worker-pool
     */
    _createNodeWorker(): NodeWorkerType;
}
//# sourceMappingURL=worker-thread.d.ts.map