"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
/**
 * Throws an `Error` with the optional `message` if `condition` is falsy
 * @note Replacement for the external assert method to reduce bundle size
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'loader assertion failed.');
    }
}
exports.assert = assert;
