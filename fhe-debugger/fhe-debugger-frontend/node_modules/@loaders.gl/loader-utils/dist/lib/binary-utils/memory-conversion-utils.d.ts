/// <reference types="node" />
/**
 * Check for Node.js `Buffer` (without triggering bundler to include Buffer polyfill on browser)
 */
export declare function isBuffer(value: any): boolean;
/**
 * Converts to Node.js `Buffer` (without triggering bundler to include Buffer polyfill on browser)
 * @todo better data type
 */
export declare function toBuffer(data: any): Buffer;
/**
 * Convert an object to an array buffer
 */
export declare function toArrayBuffer(data: unknown): ArrayBuffer;
//# sourceMappingURL=memory-conversion-utils.d.ts.map