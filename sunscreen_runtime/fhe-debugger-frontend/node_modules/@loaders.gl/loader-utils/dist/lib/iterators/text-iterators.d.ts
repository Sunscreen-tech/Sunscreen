export declare function makeTextDecoderIterator(arrayBufferIterator: AsyncIterable<ArrayBuffer> | Iterable<ArrayBuffer>, options?: TextDecoderOptions): AsyncIterable<string>;
export declare function makeTextEncoderIterator(textIterator: AsyncIterable<string> | Iterable<ArrayBuffer>): AsyncIterable<ArrayBuffer>;
/**
 * @param textIterator async iterable yielding strings
 * @returns an async iterable over lines
 * See http://2ality.com/2018/04/async-iter-nodejs.html
 */
export declare function makeLineIterator(textIterator: AsyncIterable<string>): AsyncIterable<string>;
/**
 * @param lineIterator async iterable yielding lines
 * @returns async iterable yielding numbered lines
 *
 * See http://2ality.com/2018/04/async-iter-nodejs.html
 */
export declare function makeNumberedLineIterator(lineIterator: AsyncIterable<string>): AsyncIterable<{
    counter: number;
    line: string;
}>;
//# sourceMappingURL=text-iterators.d.ts.map