"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._readToArrayBuffer = _readToArrayBuffer;
exports.writeFileSync = exports.writeFile = exports.stat = exports.readdir = exports.readFileSync = exports.readFile = exports.read = exports.open = exports.isSupported = exports.fstat = exports.createWriteStream = exports.close = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _fs = _interopRequireDefault(require("fs"));
var _buffer = require("./buffer");
var _promisify = require("./promisify");
var readdir;
exports.readdir = readdir;
var stat;
exports.stat = stat;
var readFile;
exports.readFile = readFile;
var readFileSync;
exports.readFileSync = readFileSync;
var writeFile;
exports.writeFile = writeFile;
var writeFileSync;
exports.writeFileSync = writeFileSync;
var open;
exports.open = open;
var close;
exports.close = close;
var read;
exports.read = read;
var fstat;
exports.fstat = fstat;
var createWriteStream;
exports.createWriteStream = createWriteStream;
var isSupported = Boolean(_fs.default);
exports.isSupported = isSupported;
try {
  exports.readdir = readdir = (0, _promisify.promisify2)(_fs.default.readdir);
  exports.stat = stat = (0, _promisify.promisify2)(_fs.default.stat);
  exports.readFile = readFile = _fs.default.readFile;
  exports.readFileSync = readFileSync = _fs.default.readFileSync;
  exports.writeFile = writeFile = (0, _promisify.promisify3)(_fs.default.writeFile);
  exports.writeFileSync = writeFileSync = _fs.default.writeFileSync;
  exports.open = open = _fs.default.open;
  exports.close = close = function close(fd) {
    return new Promise(function (resolve, reject) {
      return _fs.default.close(fd, function (err) {
        return err ? reject(err) : resolve();
      });
    });
  };
  exports.read = read = _fs.default.read;
  exports.fstat = fstat = _fs.default.fstat;
  exports.createWriteStream = createWriteStream = _fs.default.createWriteStream;
  exports.isSupported = isSupported = Boolean(_fs.default);
} catch (_unused) {}
function _readToArrayBuffer(_x, _x2, _x3) {
  return _readToArrayBuffer2.apply(this, arguments);
}
function _readToArrayBuffer2() {
  _readToArrayBuffer2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(fd, start, length) {
    var buffer, _yield$read, bytesRead;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          buffer = Buffer.alloc(length);
          _context.next = 3;
          return read(fd, buffer, 0, length, start);
        case 3:
          _yield$read = _context.sent;
          bytesRead = _yield$read.bytesRead;
          if (!(bytesRead !== length)) {
            _context.next = 7;
            break;
          }
          throw new Error('fs.read failed');
        case 7:
          return _context.abrupt("return", (0, _buffer.toArrayBuffer)(buffer));
        case 8:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _readToArrayBuffer2.apply(this, arguments);
}
//# sourceMappingURL=fs.js.map