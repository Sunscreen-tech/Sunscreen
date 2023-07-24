"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeStringIterator = makeStringIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _marked = _regenerator.default.mark(makeStringIterator);
var DEFAULT_CHUNK_SIZE = 256 * 1024;
function makeStringIterator(string, options) {
  var chunkSize, offset, textEncoder, chunkLength, chunk;
  return _regenerator.default.wrap(function makeStringIterator$(_context) {
    while (1) switch (_context.prev = _context.next) {
      case 0:
        chunkSize = (options === null || options === void 0 ? void 0 : options.chunkSize) || DEFAULT_CHUNK_SIZE;
        offset = 0;
        textEncoder = new TextEncoder();
      case 3:
        if (!(offset < string.length)) {
          _context.next = 11;
          break;
        }
        chunkLength = Math.min(string.length - offset, chunkSize);
        chunk = string.slice(offset, offset + chunkLength);
        offset += chunkLength;
        _context.next = 9;
        return textEncoder.encode(chunk);
      case 9:
        _context.next = 3;
        break;
      case 11:
      case "end":
        return _context.stop();
    }
  }, _marked);
}
//# sourceMappingURL=make-string-iterator.js.map