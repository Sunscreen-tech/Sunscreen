"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getArrayBufferOrStringFromData = getArrayBufferOrStringFromData;
exports.getArrayBufferOrStringFromDataSync = getArrayBufferOrStringFromDataSync;
exports.getAsyncIterableFromData = getAsyncIterableFromData;
exports.getReadableStream = getReadableStream;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _isType = require("../../javascript-utils/is-type");
var _makeIterator = require("../../iterators/make-iterator/make-iterator");
var _responseUtils = require("../utils/response-utils");
var ERR_DATA = 'Cannot convert supplied data type';
function getArrayBufferOrStringFromDataSync(data, loader, options) {
  if (loader.text && typeof data === 'string') {
    return data;
  }
  if ((0, _isType.isBuffer)(data)) {
    data = data.buffer;
  }
  if (data instanceof ArrayBuffer) {
    var arrayBuffer = data;
    if (loader.text && !loader.binary) {
      var textDecoder = new TextDecoder('utf8');
      return textDecoder.decode(arrayBuffer);
    }
    return arrayBuffer;
  }
  if (ArrayBuffer.isView(data)) {
    if (loader.text && !loader.binary) {
      var _textDecoder = new TextDecoder('utf8');
      return _textDecoder.decode(data);
    }
    var _arrayBuffer = data.buffer;
    var byteLength = data.byteLength || data.length;
    if (data.byteOffset !== 0 || byteLength !== _arrayBuffer.byteLength) {
      _arrayBuffer = _arrayBuffer.slice(data.byteOffset, data.byteOffset + byteLength);
    }
    return _arrayBuffer;
  }
  throw new Error(ERR_DATA);
}
function getArrayBufferOrStringFromData(_x, _x2, _x3) {
  return _getArrayBufferOrStringFromData.apply(this, arguments);
}
function _getArrayBufferOrStringFromData() {
  _getArrayBufferOrStringFromData = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, loader, options) {
    var isArrayBuffer, response;
    return _regenerator.default.wrap(function _callee$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          isArrayBuffer = data instanceof ArrayBuffer || ArrayBuffer.isView(data);
          if (!(typeof data === 'string' || isArrayBuffer)) {
            _context3.next = 3;
            break;
          }
          return _context3.abrupt("return", getArrayBufferOrStringFromDataSync(data, loader, options));
        case 3:
          if (!(0, _isType.isBlob)(data)) {
            _context3.next = 7;
            break;
          }
          _context3.next = 6;
          return (0, _responseUtils.makeResponse)(data);
        case 6:
          data = _context3.sent;
        case 7:
          if (!(0, _isType.isResponse)(data)) {
            _context3.next = 21;
            break;
          }
          response = data;
          _context3.next = 11;
          return (0, _responseUtils.checkResponse)(response);
        case 11:
          if (!loader.binary) {
            _context3.next = 17;
            break;
          }
          _context3.next = 14;
          return response.arrayBuffer();
        case 14:
          _context3.t0 = _context3.sent;
          _context3.next = 20;
          break;
        case 17:
          _context3.next = 19;
          return response.text();
        case 19:
          _context3.t0 = _context3.sent;
        case 20:
          return _context3.abrupt("return", _context3.t0);
        case 21:
          if ((0, _isType.isReadableStream)(data)) {
            data = (0, _makeIterator.makeIterator)(data, options);
          }
          if (!((0, _isType.isIterable)(data) || (0, _isType.isAsyncIterable)(data))) {
            _context3.next = 24;
            break;
          }
          return _context3.abrupt("return", (0, _loaderUtils.concatenateArrayBuffersAsync)(data));
        case 24:
          throw new Error(ERR_DATA);
        case 25:
        case "end":
          return _context3.stop();
      }
    }, _callee);
  }));
  return _getArrayBufferOrStringFromData.apply(this, arguments);
}
function getAsyncIterableFromData(_x4, _x5) {
  return _getAsyncIterableFromData.apply(this, arguments);
}
function _getAsyncIterableFromData() {
  _getAsyncIterableFromData = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(data, options) {
    var response, body;
    return _regenerator.default.wrap(function _callee2$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          if (!(0, _isType.isIterator)(data)) {
            _context4.next = 2;
            break;
          }
          return _context4.abrupt("return", data);
        case 2:
          if (!(0, _isType.isResponse)(data)) {
            _context4.next = 10;
            break;
          }
          response = data;
          _context4.next = 6;
          return (0, _responseUtils.checkResponse)(response);
        case 6:
          _context4.next = 8;
          return response.body;
        case 8:
          body = _context4.sent;
          return _context4.abrupt("return", (0, _makeIterator.makeIterator)(body, options));
        case 10:
          if (!((0, _isType.isBlob)(data) || (0, _isType.isReadableStream)(data))) {
            _context4.next = 12;
            break;
          }
          return _context4.abrupt("return", (0, _makeIterator.makeIterator)(data, options));
        case 12:
          if (!(0, _isType.isAsyncIterable)(data)) {
            _context4.next = 14;
            break;
          }
          return _context4.abrupt("return", data[Symbol.asyncIterator]());
        case 14:
          return _context4.abrupt("return", getIterableFromData(data));
        case 15:
        case "end":
          return _context4.stop();
      }
    }, _callee2);
  }));
  return _getAsyncIterableFromData.apply(this, arguments);
}
function getReadableStream(_x6) {
  return _getReadableStream.apply(this, arguments);
}
function _getReadableStream() {
  _getReadableStream = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(data) {
    var response;
    return _regenerator.default.wrap(function _callee3$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          if (!(0, _isType.isReadableStream)(data)) {
            _context5.next = 2;
            break;
          }
          return _context5.abrupt("return", data);
        case 2:
          if (!(0, _isType.isResponse)(data)) {
            _context5.next = 4;
            break;
          }
          return _context5.abrupt("return", data.body);
        case 4:
          _context5.next = 6;
          return (0, _responseUtils.makeResponse)(data);
        case 6:
          response = _context5.sent;
          return _context5.abrupt("return", response.body);
        case 8:
        case "end":
          return _context5.stop();
      }
    }, _callee3);
  }));
  return _getReadableStream.apply(this, arguments);
}
function getIterableFromData(data) {
  if (ArrayBuffer.isView(data)) {
    return _regenerator.default.mark(function oneChunk() {
      return _regenerator.default.wrap(function oneChunk$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return data.buffer;
          case 2:
          case "end":
            return _context.stop();
        }
      }, oneChunk);
    })();
  }
  if (data instanceof ArrayBuffer) {
    return _regenerator.default.mark(function oneChunk() {
      return _regenerator.default.wrap(function oneChunk$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return data;
          case 2:
          case "end":
            return _context2.stop();
        }
      }, oneChunk);
    })();
  }
  if ((0, _isType.isIterator)(data)) {
    return data;
  }
  if ((0, _isType.isIterable)(data)) {
    return data[Symbol.iterator]();
  }
  throw new Error(ERR_DATA);
}
//# sourceMappingURL=get-data.js.map