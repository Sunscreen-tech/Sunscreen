export default class AsyncQueue<T> {
    private _values;
    private _settlers;
    private _closed;
    constructor();
    close(): void;
    [Symbol.asyncIterator](): AsyncIterator<T>;
    enqueue(value: T | Error): void;
    /**
     * @returns a Promise for an IteratorResult
     */
    next(): Promise<any>;
}
/**
 * @returns a Promise for an Array with the elements in `asyncIterable`
 */
export declare function takeAsync(asyncIterable: AsyncIterable<any>, count?: number): Promise<any[]>;
//# sourceMappingURL=async-queue.d.ts.map