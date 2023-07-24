"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeWritableFile = makeWritableFile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _globals = require("../env-utils/globals");
var fs = _interopRequireWildcard(require("../node/fs"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function makeWritableFile(pathOrStream, options) {
  if (_globals.isBrowser) {
    return {
      write: function () {
        var _write = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
          return _regenerator.default.wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function write() {
          return _write.apply(this, arguments);
        }
        return write;
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
      }()
    };
  }
  var outputStream = typeof pathOrStream === 'string' ? fs.createWriteStream(pathOrStream, options) : pathOrStream;
  return {
    write: function () {
      var _write2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(buffer) {
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              return _context3.abrupt("return", new Promise(function (resolve, reject) {
                outputStream.write(buffer, function (err) {
                  return err ? reject(err) : resolve();
                });
              }));
            case 1:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function write(_x) {
        return _write2.apply(this, arguments);
      }
      return write;
    }(),
    close: function close() {
      return new Promise(function (resolve, reject) {
        outputStream.close(function (err) {
          return err ? reject(err) : resolve();
        });
      });
    }
  };
}
//# sourceMappingURL=writable-file.js.map