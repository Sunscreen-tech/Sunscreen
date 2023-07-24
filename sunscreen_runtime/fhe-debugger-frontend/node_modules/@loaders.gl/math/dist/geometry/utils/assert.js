"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
/**
 * Throws error message
 * @param condition checks if an attribute equal to condition
 * @param message error message
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(`math.gl assertion failed. ${message}`);
    }
}
exports.assert = assert;
