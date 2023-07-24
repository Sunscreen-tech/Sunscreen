"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeBlobIterator = makeBlobIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _awaitAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/awaitAsyncGenerator"));
var _wrapAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapAsyncGenerator"));
var DEFAULT_CHUNK_SIZE = 1024 * 1024;
function makeBlobIterator(_x, _x2) {
  return _makeBlobIterator.apply(this, arguments);
}
function _makeBlobIterator() {
  _makeBlobIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee(blob, options) {
    var chunkSize, offset, end, chunk;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          chunkSize = (options === null || options === void 0 ? void 0 : options.chunkSize) || DEFAULT_CHUNK_SIZE;
          offset = 0;
        case 2:
          if (!(offset < blob.size)) {
            _context.next = 12;
            break;
          }
          end = offset + chunkSize;
          _context.next = 6;
          return (0, _awaitAsyncGenerator2.default)(blob.slice(offset, end).arrayBuffer());
        case 6:
          chunk = _context.sent;
          offset = end;
          _context.next = 10;
          return chunk;
        case 10:
          _context.next = 2;
          break;
        case 12:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _makeBlobIterator.apply(this, arguments);
}
//# sourceMappingURL=make-blob-iterator.js.map