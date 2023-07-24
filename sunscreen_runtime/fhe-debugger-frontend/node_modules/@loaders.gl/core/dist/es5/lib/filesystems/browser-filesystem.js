"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var BrowserFileSystem = function () {
  function BrowserFileSystem(files, options) {
    (0, _classCallCheck2.default)(this, BrowserFileSystem);
    (0, _defineProperty2.default)(this, "_fetch", void 0);
    (0, _defineProperty2.default)(this, "files", {});
    (0, _defineProperty2.default)(this, "lowerCaseFiles", {});
    (0, _defineProperty2.default)(this, "usedFiles", {});
    this._fetch = (options === null || options === void 0 ? void 0 : options.fetch) || fetch;
    for (var i = 0; i < files.length; ++i) {
      var file = files[i];
      this.files[file.name] = file;
      this.lowerCaseFiles[file.name.toLowerCase()] = file;
      this.usedFiles[file.name] = false;
    }
    this.fetch = this.fetch.bind(this);
  }
  (0, _createClass2.default)(BrowserFileSystem, [{
    key: "fetch",
    value: function () {
      var _fetch = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(path, options) {
        var file, headers, range, bytes, start, end, data, _response, response;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (!path.includes('://')) {
                _context.next = 2;
                break;
              }
              return _context.abrupt("return", this._fetch(path, options));
            case 2:
              file = this.files[path];
              if (file) {
                _context.next = 5;
                break;
              }
              return _context.abrupt("return", new Response(path, {
                status: 400,
                statusText: 'NOT FOUND'
              }));
            case 5:
              headers = new Headers(options === null || options === void 0 ? void 0 : options.headers);
              range = headers.get('Range');
              bytes = range && /bytes=($1)-($2)/.exec(range);
              if (!bytes) {
                _context.next = 17;
                break;
              }
              start = parseInt(bytes[1]);
              end = parseInt(bytes[2]);
              _context.next = 13;
              return file.slice(start, end).arrayBuffer();
            case 13:
              data = _context.sent;
              _response = new Response(data);
              Object.defineProperty(_response, 'url', {
                value: path
              });
              return _context.abrupt("return", _response);
            case 17:
              response = new Response(file);
              Object.defineProperty(response, 'url', {
                value: path
              });
              return _context.abrupt("return", response);
            case 20:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function fetch(_x, _x2) {
        return _fetch.apply(this, arguments);
      }
      return fetch;
    }()
  }, {
    key: "readdir",
    value: function () {
      var _readdir = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(dirname) {
        var files, path;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              files = [];
              for (path in this.files) {
                files.push(path);
              }
              return _context2.abrupt("return", files);
            case 3:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function readdir(_x3) {
        return _readdir.apply(this, arguments);
      }
      return readdir;
    }()
  }, {
    key: "stat",
    value: function () {
      var _stat = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(path, options) {
        var file;
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              file = this.files[path];
              if (file) {
                _context3.next = 3;
                break;
              }
              throw new Error(path);
            case 3:
              return _context3.abrupt("return", {
                size: file.size
              });
            case 4:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function stat(_x4, _x5) {
        return _stat.apply(this, arguments);
      }
      return stat;
    }()
  }, {
    key: "unlink",
    value: function () {
      var _unlink = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(path) {
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              delete this.files[path];
              delete this.lowerCaseFiles[path];
              this.usedFiles[path] = true;
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function unlink(_x6) {
        return _unlink.apply(this, arguments);
      }
      return unlink;
    }()
  }, {
    key: "open",
    value: function () {
      var _open = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee5(pathname, flags, mode) {
        return _regenerator.default.wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              return _context5.abrupt("return", this.files[pathname]);
            case 1:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function open(_x7, _x8, _x9) {
        return _open.apply(this, arguments);
      }
      return open;
    }()
  }, {
    key: "read",
    value: function () {
      var _read = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee6(fd, buffer) {
        var offset,
          length,
          position,
          file,
          startPosition,
          arrayBuffer,
          _args6 = arguments;
        return _regenerator.default.wrap(function _callee6$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              offset = _args6.length > 2 && _args6[2] !== undefined ? _args6[2] : 0;
              length = _args6.length > 3 && _args6[3] !== undefined ? _args6[3] : buffer.byteLength;
              position = _args6.length > 4 && _args6[4] !== undefined ? _args6[4] : null;
              file = fd;
              startPosition = 0;
              _context6.next = 7;
              return file.slice(startPosition, startPosition + length).arrayBuffer();
            case 7:
              arrayBuffer = _context6.sent;
              return _context6.abrupt("return", {
                bytesRead: length,
                buffer: arrayBuffer
              });
            case 9:
            case "end":
              return _context6.stop();
          }
        }, _callee6);
      }));
      function read(_x10, _x11) {
        return _read.apply(this, arguments);
      }
      return read;
    }()
  }, {
    key: "close",
    value: function () {
      var _close = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee7(fd) {
        return _regenerator.default.wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
            case "end":
              return _context7.stop();
          }
        }, _callee7);
      }));
      function close(_x12) {
        return _close.apply(this, arguments);
      }
      return close;
    }()
  }, {
    key: "_getFile",
    value: function _getFile(path, used) {
      var file = this.files[path] || this.lowerCaseFiles[path];
      if (file && used) {
        this.usedFiles[path] = true;
      }
      return file;
    }
  }]);
  return BrowserFileSystem;
}();
exports.default = BrowserFileSystem;
//# sourceMappingURL=browser-filesystem.js.map