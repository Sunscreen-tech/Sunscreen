"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readArrayBuffer = readArrayBuffer;
exports.readBlob = readBlob;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function readArrayBuffer(_x, _x2, _x3) {
  return _readArrayBuffer.apply(this, arguments);
}
function _readArrayBuffer() {
  _readArrayBuffer = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(file, start, length) {
    var slice;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(typeof file === 'number')) {
            _context.next = 4;
            break;
          }
          _context.next = 3;
          return _loaderUtils.fs._readToArrayBuffer(file, start, length);
        case 3:
          return _context.abrupt("return", _context.sent);
        case 4:
          if (!(file instanceof Blob)) {
            file = new Blob([file]);
          }
          slice = file.slice(start, start + length);
          _context.next = 8;
          return readBlob(slice);
        case 8:
          return _context.abrupt("return", _context.sent);
        case 9:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _readArrayBuffer.apply(this, arguments);
}
function readBlob(_x4) {
  return _readBlob.apply(this, arguments);
}
function _readBlob() {
  _readBlob = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(blob) {
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return new Promise(function (resolve, reject) {
            var fileReader = new FileReader();
            fileReader.onload = function (event) {
              var _event$target;
              return resolve(event === null || event === void 0 ? void 0 : (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result);
            };
            fileReader.onerror = function (error) {
              return reject(error);
            };
            fileReader.readAsArrayBuffer(blob);
          });
        case 2:
          return _context2.abrupt("return", _context2.sent);
        case 3:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _readBlob.apply(this, arguments);
}
//# sourceMappingURL=read-array-buffer.js.map