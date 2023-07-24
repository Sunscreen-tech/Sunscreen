/// <reference types="node" />
/**
 * Convert Buffer to ArrayBuffer
 * Converts Node.js `Buffer` to `ArrayBuffer` (without triggering bundler to include Buffer polyfill on browser)
 * @todo better data type
 */
export declare function toArrayBuffer(buffer: any): any;
/**
 * Convert (copy) ArrayBuffer to Buffer
 */
export declare function toBuffer(binaryData: ArrayBuffer | ArrayBuffer | Buffer): Buffer;
//# sourceMappingURL=buffer.browser.d.ts.map