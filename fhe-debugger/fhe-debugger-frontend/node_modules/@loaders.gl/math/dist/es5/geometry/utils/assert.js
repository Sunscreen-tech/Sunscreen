"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assert = assert;
function assert(condition, message) {
  if (!condition) {
    throw new Error("math.gl assertion failed. ".concat(message));
  }
}
//# sourceMappingURL=assert.js.map