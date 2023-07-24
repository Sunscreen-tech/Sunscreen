import { Writer, WriterOptions } from '@loaders.gl/loader-utils';
/**
 * Encode loaded data into a binary ArrayBuffer using the specified Writer.
 */
export declare function encode(data: any, writer: Writer, options?: WriterOptions): Promise<ArrayBuffer>;
/**
 * Encode loaded data into a binary ArrayBuffer using the specified Writer.
 */
export declare function encodeSync(data: any, writer: Writer, options?: WriterOptions): ArrayBuffer;
/**
 * Encode loaded data to text using the specified Writer
 * @note This is a convenience function not intended for production use on large input data.
 * It is not optimized for performance. Data maybe converted from text to binary and back.
 * @throws if the writer does not generate text output
 */
export declare function encodeText(data: any, writer: Writer, options?: WriterOptions): Promise<string>;
/**
 * Encode loaded data into a sequence (iterator) of binary ArrayBuffers using the specified Writer.
 */
export declare function encodeInBatches(data: any, writer: Writer, options?: WriterOptions): AsyncIterable<ArrayBuffer>;
/**
 * Encode data stored in a file (on disk) to another file.
 * @note Node.js only. This function enables using command-line converters as "writers".
 */
export declare function encodeURLtoURL(inputUrl: any, outputUrl: any, writer: Writer, options: any): Promise<string>;
//# sourceMappingURL=encode.d.ts.map