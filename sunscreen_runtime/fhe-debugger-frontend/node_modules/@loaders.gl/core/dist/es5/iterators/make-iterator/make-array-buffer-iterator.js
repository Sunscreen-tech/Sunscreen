"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeArrayBufferIterator = makeArrayBufferIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var DEFAULT_CHUNK_SIZE = 256 * 1024;
function makeArrayBufferIterator(arrayBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return _regenerator.default.mark(function _callee() {
    var _options$chunkSize, chunkSize, byteOffset, chunkByteLength, chunk, sourceArray, chunkArray;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _options$chunkSize = options.chunkSize, chunkSize = _options$chunkSize === void 0 ? DEFAULT_CHUNK_SIZE : _options$chunkSize;
          byteOffset = 0;
        case 2:
          if (!(byteOffset < arrayBuffer.byteLength)) {
            _context.next = 13;
            break;
          }
          chunkByteLength = Math.min(arrayBuffer.byteLength - byteOffset, chunkSize);
          chunk = new ArrayBuffer(chunkByteLength);
          sourceArray = new Uint8Array(arrayBuffer, byteOffset, chunkByteLength);
          chunkArray = new Uint8Array(chunk);
          chunkArray.set(sourceArray);
          byteOffset += chunkByteLength;
          _context.next = 11;
          return chunk;
        case 11:
          _context.next = 2;
          break;
        case 13:
        case "end":
          return _context.stop();
      }
    }, _callee);
  })();
}
//# sourceMappingURL=make-array-buffer-iterator.js.map