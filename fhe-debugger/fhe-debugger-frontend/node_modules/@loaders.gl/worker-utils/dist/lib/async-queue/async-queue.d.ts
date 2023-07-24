/**
 * Async Queue
 * - AsyncIterable: An async iterator can be
 * - Values can be pushed onto the queue
 * @example
 *   const asyncQueue = new AsyncQueue();
 *   setTimeout(() => asyncQueue.enqueue('tick'), 1000);
 *   setTimeout(() => asyncQueue.enqueue(new Error('done')), 10000);
 *   for await (const value of asyncQueue) {
 *     console.log(value); // tick
 *   }
 */
export default class AsyncQueue<T> {
    private _values;
    private _settlers;
    private _closed;
    constructor();
    /** Return an async iterator for this queue */
    [Symbol.asyncIterator](): AsyncIterator<T>;
    /** Push a new value - the async iterator will yield a promise resolved to this value */
    push(value: T): void;
    /**
     * Push a new value - the async iterator will yield a promise resolved to this value
     * Add an error - the async iterator will yield a promise rejected with this value
     */
    enqueue(value: T | Error): void;
    /** Indicate that we not waiting for more values - The async iterator will be done */
    close(): void;
    /** @returns a Promise for an IteratorResult */
    next(): Promise<IteratorResult<T, any>>;
}
//# sourceMappingURL=async-queue.d.ts.map