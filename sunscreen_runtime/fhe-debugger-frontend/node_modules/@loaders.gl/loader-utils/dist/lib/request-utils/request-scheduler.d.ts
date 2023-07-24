import { Stats } from '@probe.gl/stats';
type Handle = any;
type DoneFunction = () => any;
type GetPriorityFunction = () => number;
type RequestResult = {
    done: DoneFunction;
} | null;
/** RequestScheduler Options */
export type RequestSchedulerProps = {
    id?: string;
    throttleRequests?: boolean;
    maxRequests?: number;
};
/** Tracks one request */
type Request = {
    handle: Handle;
    priority: number;
    getPriority: GetPriorityFunction;
    resolve?: (value: any) => any;
};
/**
 * Used to issue a request, without having them "deeply queued" by the browser.
 * @todo - Track requests globally, across multiple servers
 */
export default class RequestScheduler {
    readonly props: Required<RequestSchedulerProps>;
    readonly stats: Stats;
    activeRequestCount: number;
    /** Tracks the number of active requests and prioritizes/cancels queued requests. */
    private requestQueue;
    private requestMap;
    private deferredUpdate;
    constructor(props?: RequestSchedulerProps);
    /**
     * Called by an application that wants to issue a request, without having it deeply queued by the browser
     *
     * When the returned promise resolved, it is OK for the application to issue a request.
     * The promise resolves to an object that contains a `done` method.
     * When the application's request has completed (or failed), the application must call the `done` function
     *
     * @param handle
     * @param getPriority will be called when request "slots" open up,
     *    allowing the caller to update priority or cancel the request
     *    Highest priority executes first, priority < 0 cancels the request
     * @returns a promise
     *   - resolves to a object (with a `done` field) when the request can be issued without queueing,
     *   - resolves to `null` if the request has been cancelled (by the callback return < 0).
     *     In this case the application should not issue the request
     */
    scheduleRequest(handle: Handle, getPriority?: GetPriorityFunction): Promise<RequestResult>;
    _issueRequest(request: Request): Promise<any>;
    /** We check requests asynchronously, to prevent multiple updates */
    _issueNewRequests(): void;
    /** Refresh all requests  */
    _issueNewRequestsAsync(): void;
    /** Ensure all requests have updated priorities, and that no longer valid requests are cancelled */
    _updateAllRequests(): void;
    /** Update a single request by calling the callback */
    _updateRequest(request: any): boolean;
}
export {};
//# sourceMappingURL=request-scheduler.d.ts.map