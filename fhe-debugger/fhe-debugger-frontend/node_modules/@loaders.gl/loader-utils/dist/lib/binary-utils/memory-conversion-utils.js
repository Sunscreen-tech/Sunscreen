"use strict";
// loaders.gl, MIT license
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toArrayBuffer = exports.toBuffer = exports.isBuffer = void 0;
const node = __importStar(require("../node/buffer"));
/**
 * Check for Node.js `Buffer` (without triggering bundler to include Buffer polyfill on browser)
 */
function isBuffer(value) {
    return value && typeof value === 'object' && value.isBuffer;
}
exports.isBuffer = isBuffer;
/**
 * Converts to Node.js `Buffer` (without triggering bundler to include Buffer polyfill on browser)
 * @todo better data type
 */
function toBuffer(data) {
    return node.toBuffer ? node.toBuffer(data) : data;
}
exports.toBuffer = toBuffer;
/**
 * Convert an object to an array buffer
 */
function toArrayBuffer(data) {
    // Note: Should be called first, Buffers can trigger other detections below
    if (isBuffer(data)) {
        return node.toArrayBuffer(data);
    }
    if (data instanceof ArrayBuffer) {
        return data;
    }
    // Careful - Node Buffers look like Uint8Arrays (keep after isBuffer)
    if (ArrayBuffer.isView(data)) {
        if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
            return data.buffer;
        }
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    if (typeof data === 'string') {
        const text = data;
        const uint8Array = new TextEncoder().encode(text);
        return uint8Array.buffer;
    }
    // HACK to support Blob polyfill
    if (data && typeof data === 'object' && data._toArrayBuffer) {
        return data._toArrayBuffer();
    }
    throw new Error('toArrayBuffer');
}
exports.toArrayBuffer = toArrayBuffer;
