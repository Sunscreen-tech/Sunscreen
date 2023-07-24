"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assert = assert;
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'assert failed: gltf');
  }
}
//# sourceMappingURL=assert.js.map