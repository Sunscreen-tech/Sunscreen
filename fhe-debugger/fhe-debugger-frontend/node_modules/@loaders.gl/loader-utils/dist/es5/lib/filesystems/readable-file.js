"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeReadableFile = makeReadableFile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function makeReadableFile(data) {
  if (data instanceof ArrayBuffer) {
    var arrayBuffer = data;
    return {
      read: function () {
        var _read = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(start, length) {
          return _regenerator.default.wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", Buffer.from(data, start, length));
              case 1:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function read(_x, _x2) {
          return _read.apply(this, arguments);
        }
        return read;
      }(),
      close: function () {
        var _close = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2() {
          return _regenerator.default.wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
              case "end":
                return _context2.stop();
            }
          }, _callee2);
        }));
        function close() {
          return _close.apply(this, arguments);
        }
        return close;
      }(),
      size: arrayBuffer.byteLength
    };
  }
  var blob = data;
  return {
    read: function () {
      var _read2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(start, length) {
        var arrayBuffer;
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return blob.slice(start, start + length).arrayBuffer();
            case 2:
              arrayBuffer = _context3.sent;
              return _context3.abrupt("return", Buffer.from(arrayBuffer));
            case 4:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function read(_x3, _x4) {
        return _read2.apply(this, arguments);
      }
      return read;
    }(),
    close: function () {
      var _close2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4() {
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
            case "end":
              return _context4.stop();
          }
        }, _callee4);
      }));
      function close() {
        return _close2.apply(this, arguments);
      }
      return close;
    }(),
    size: blob.size
  };
}
//# sourceMappingURL=readable-file.js.map