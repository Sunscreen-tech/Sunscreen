"use strict";
// Replacement for the external assert method to reduce bundle size
// Note: We don't use the second "message" argument in calling code,
// so no need to support it here
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
/** Throws an `Error` with the optional `message` if `condition` is falsy */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'loaders.gl assertion failed.');
    }
}
exports.assert = assert;
