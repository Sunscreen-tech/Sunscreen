"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
// Replacement for the external assert method to reduce bundle size
// Note: We don't use the second "message" argument in calling code,
// so no need to support it here
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'assert failed: gltf');
    }
}
exports.assert = assert;
