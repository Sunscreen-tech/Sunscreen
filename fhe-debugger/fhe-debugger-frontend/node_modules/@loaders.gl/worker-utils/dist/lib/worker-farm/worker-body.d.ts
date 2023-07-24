import type { WorkerMessageType, WorkerMessagePayload } from '../../types';
/**
 * Type safe wrapper for worker code
 */
export default class WorkerBody {
    /** Check that we are actually in a worker thread */
    static inWorkerThread(): boolean;
    static set onmessage(onMessage: (type: WorkerMessageType, payload: WorkerMessagePayload) => any);
    static addEventListener(onMessage: (type: WorkerMessageType, payload: WorkerMessagePayload) => any): void;
    static removeEventListener(onMessage: (type: WorkerMessageType, payload: WorkerMessagePayload) => any): void;
    /**
     * Send a message from a worker to creating thread (main thread)
     * @param type
     * @param payload
     */
    static postMessage(type: WorkerMessageType, payload: WorkerMessagePayload): void;
}
//# sourceMappingURL=worker-body.d.ts.map