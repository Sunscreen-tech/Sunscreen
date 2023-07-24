"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var fs = _interopRequireWildcard(require("../node/fs"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
var NodeFileSystem = function () {
  function NodeFileSystem(options) {
    (0, _classCallCheck2.default)(this, NodeFileSystem);
    this.fetch = options._fetch;
  }
  (0, _createClass2.default)(NodeFileSystem, [{
    key: "readdir",
    value: function () {
      var _readdir = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
        var dirname,
          options,
          _args = arguments;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              dirname = _args.length > 0 && _args[0] !== undefined ? _args[0] : '.';
              options = _args.length > 1 ? _args[1] : undefined;
              _context.next = 4;
              return fs.readdir(dirname, options);
            case 4:
              return _context.abrupt("return", _context.sent);
            case 5:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function readdir() {
        return _readdir.apply(this, arguments);
      }
      return readdir;
    }()
  }, {
    key: "stat",
    value: function () {
      var _stat = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(path, options) {
        var info;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return fs.stat(path, options);
            case 2:
              info = _context2.sent;
              return _context2.abrupt("return", {
                size: Number(info.size),
                isDirectory: function isDirectory() {
                  return false;
                },
                info: info
              });
            case 4:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }));
      function stat(_x, _x2) {
        return _stat.apply(this, arguments);
      }
      return stat;
    }()
  }, {
    key: "fetch",
    value: function () {
      var _fetch = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(path, options) {
        var fallbackFetch;
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              fallbackFetch = options.fetch || this.fetch;
              return _context3.abrupt("return", fallbackFetch(path, options));
            case 2:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function fetch(_x3, _x4) {
        return _fetch.apply(this, arguments);
      }
      return fetch;
    }()
  }, {
    key: "open",
    value: function () {
      var _open = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(path, flags, mode) {
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return fs.open(path, flags);
            case 2:
              return _context4.abrupt("return", _context4.sent);
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee4);
      }));
      function open(_x5, _x6, _x7) {
        return _open.apply(this, arguments);
      }
      return open;
    }()
  }, {
    key: "close",
    value: function () {
      var _close = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee5(fd) {
        return _regenerator.default.wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return fs.close(fd);
            case 2:
              return _context5.abrupt("return", _context5.sent);
            case 3:
            case "end":
              return _context5.stop();
          }
        }, _callee5);
      }));
      function close(_x8) {
        return _close.apply(this, arguments);
      }
      return close;
    }()
  }, {
    key: "fstat",
    value: function () {
      var _fstat = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee6(fd) {
        var info;
        return _regenerator.default.wrap(function _callee6$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return fs.fstat(fd);
            case 2:
              info = _context6.sent;
              return _context6.abrupt("return", info);
            case 4:
            case "end":
              return _context6.stop();
          }
        }, _callee6);
      }));
      function fstat(_x9) {
        return _fstat.apply(this, arguments);
      }
      return fstat;
    }()
  }, {
    key: "read",
    value: function () {
      var _read = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee7(fd, _ref) {
        var _ref$buffer, buffer, _ref$offset, offset, _ref$length, length, _ref$position, position, totalBytesRead, _yield$fs$read, bytesRead;
        return _regenerator.default.wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _ref$buffer = _ref.buffer, buffer = _ref$buffer === void 0 ? null : _ref$buffer, _ref$offset = _ref.offset, offset = _ref$offset === void 0 ? 0 : _ref$offset, _ref$length = _ref.length, length = _ref$length === void 0 ? buffer.byteLength : _ref$length, _ref$position = _ref.position, position = _ref$position === void 0 ? null : _ref$position;
              totalBytesRead = 0;
            case 2:
              if (!(totalBytesRead < length)) {
                _context7.next = 10;
                break;
              }
              _context7.next = 5;
              return fs.read(fd, buffer, offset + totalBytesRead, length - totalBytesRead, position + totalBytesRead);
            case 5:
              _yield$fs$read = _context7.sent;
              bytesRead = _yield$fs$read.bytesRead;
              totalBytesRead += bytesRead;
              _context7.next = 2;
              break;
            case 10:
              return _context7.abrupt("return", {
                bytesRead: totalBytesRead,
                buffer: buffer
              });
            case 11:
            case "end":
              return _context7.stop();
          }
        }, _callee7);
      }));
      function read(_x10, _x11) {
        return _read.apply(this, arguments);
      }
      return read;
    }()
  }]);
  return NodeFileSystem;
}();
exports.default = NodeFileSystem;
//# sourceMappingURL=node-filesystem.js.map