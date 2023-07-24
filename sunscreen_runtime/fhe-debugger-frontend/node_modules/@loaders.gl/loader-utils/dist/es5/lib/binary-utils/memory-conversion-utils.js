"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof3 = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isBuffer = isBuffer;
exports.toArrayBuffer = toArrayBuffer;
exports.toBuffer = toBuffer;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var node = _interopRequireWildcard(require("../node/buffer"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof3(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function isBuffer(value) {
  return value && (0, _typeof2.default)(value) === 'object' && value.isBuffer;
}
function toBuffer(data) {
  return node.toBuffer ? node.toBuffer(data) : data;
}
function toArrayBuffer(data) {
  if (isBuffer(data)) {
    return node.toArrayBuffer(data);
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
      return data.buffer;
    }
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (typeof data === 'string') {
    var text = data;
    var uint8Array = new TextEncoder().encode(text);
    return uint8Array.buffer;
  }
  if (data && (0, _typeof2.default)(data) === 'object' && data._toArrayBuffer) {
    return data._toArrayBuffer();
  }
  throw new Error('toArrayBuffer');
}
//# sourceMappingURL=memory-conversion-utils.js.map