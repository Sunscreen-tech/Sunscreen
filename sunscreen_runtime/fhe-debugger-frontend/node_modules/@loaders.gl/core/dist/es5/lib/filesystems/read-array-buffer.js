"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readArrayBuffer = readArrayBuffer;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function readArrayBuffer(_x, _x2, _x3) {
  return _readArrayBuffer.apply(this, arguments);
}
function _readArrayBuffer() {
  _readArrayBuffer = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(file, start, length) {
    var slice;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(file instanceof Blob)) {
            _context.next = 5;
            break;
          }
          slice = file.slice(start, start + length);
          _context.next = 4;
          return slice.arrayBuffer();
        case 4:
          return _context.abrupt("return", _context.sent);
        case 5:
          _context.next = 7;
          return file.read(start, start + length);
        case 7:
          return _context.abrupt("return", _context.sent);
        case 8:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _readArrayBuffer.apply(this, arguments);
}
//# sourceMappingURL=read-array-buffer.js.map