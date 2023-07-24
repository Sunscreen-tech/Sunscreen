"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toArrayBuffer = toArrayBuffer;
exports.toBuffer = toBuffer;
function toArrayBuffer(buffer) {
  return buffer;
}
function toBuffer(binaryData) {
  throw new Error('Buffer not supported in browser');
}
//# sourceMappingURL=buffer.browser.js.map