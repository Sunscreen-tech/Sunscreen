"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fetchProgress;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function fetchProgress(_x, _x2) {
  return _fetchProgress.apply(this, arguments);
}
function _fetchProgress() {
  _fetchProgress = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(response, onProgress) {
    var onDone,
      onError,
      body,
      contentLength,
      totalBytes,
      progressStream,
      _args2 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          onDone = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : function () {};
          onError = _args2.length > 3 && _args2[3] !== undefined ? _args2[3] : function () {};
          _context2.next = 4;
          return response;
        case 4:
          response = _context2.sent;
          if (response.ok) {
            _context2.next = 7;
            break;
          }
          return _context2.abrupt("return", response);
        case 7:
          body = response.body;
          if (body) {
            _context2.next = 10;
            break;
          }
          return _context2.abrupt("return", response);
        case 10:
          contentLength = response.headers.get('content-length') || 0;
          totalBytes = contentLength ? parseInt(contentLength) : 0;
          if (totalBytes > 0) {
            _context2.next = 14;
            break;
          }
          return _context2.abrupt("return", response);
        case 14:
          if (!(typeof ReadableStream === 'undefined' || !body.getReader)) {
            _context2.next = 16;
            break;
          }
          return _context2.abrupt("return", response);
        case 16:
          progressStream = new ReadableStream({
            start: function start(controller) {
              return (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
                var reader;
                return _regenerator.default.wrap(function _callee$(_context) {
                  while (1) switch (_context.prev = _context.next) {
                    case 0:
                      reader = body.getReader();
                      _context.next = 3;
                      return read(controller, reader, 0, totalBytes, onProgress, onDone, onError);
                    case 3:
                    case "end":
                      return _context.stop();
                  }
                }, _callee);
              }))();
            }
          });
          return _context2.abrupt("return", new Response(progressStream));
        case 18:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _fetchProgress.apply(this, arguments);
}
function read(_x3, _x4, _x5, _x6, _x7, _x8, _x9) {
  return _read.apply(this, arguments);
}
function _read() {
  _read = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(controller, reader, loadedBytes, totalBytes, onProgress, onDone, onError) {
    var _yield$reader$read, done, value, percent;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return reader.read();
        case 3:
          _yield$reader$read = _context3.sent;
          done = _yield$reader$read.done;
          value = _yield$reader$read.value;
          if (!done) {
            _context3.next = 10;
            break;
          }
          onDone();
          controller.close();
          return _context3.abrupt("return");
        case 10:
          loadedBytes += value.byteLength;
          percent = Math.round(loadedBytes / totalBytes * 100);
          onProgress(percent, {
            loadedBytes: loadedBytes,
            totalBytes: totalBytes
          });
          controller.enqueue(value);
          _context3.next = 16;
          return read(controller, reader, loadedBytes, totalBytes, onProgress, onDone, onError);
        case 16:
          _context3.next = 22;
          break;
        case 18:
          _context3.prev = 18;
          _context3.t0 = _context3["catch"](0);
          controller.error(_context3.t0);
          onError(_context3.t0);
        case 22:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 18]]);
  }));
  return _read.apply(this, arguments);
}
//# sourceMappingURL=fetch-progress.js.map