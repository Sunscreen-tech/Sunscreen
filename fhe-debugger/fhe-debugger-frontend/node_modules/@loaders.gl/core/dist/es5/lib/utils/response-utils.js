"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkResponse = checkResponse;
exports.checkResponseSync = checkResponseSync;
exports.makeResponse = makeResponse;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _isType = require("../../javascript-utils/is-type");
var _resourceUtils = require("./resource-utils");
function makeResponse(_x) {
  return _makeResponse.apply(this, arguments);
}
function _makeResponse() {
  _makeResponse = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(resource) {
    var headers, contentLength, url, type, initialDataUrl, response;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(0, _isType.isResponse)(resource)) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", resource);
        case 2:
          headers = {};
          contentLength = (0, _resourceUtils.getResourceContentLength)(resource);
          if (contentLength >= 0) {
            headers['content-length'] = String(contentLength);
          }
          url = (0, _resourceUtils.getResourceUrl)(resource);
          type = (0, _resourceUtils.getResourceMIMEType)(resource);
          if (type) {
            headers['content-type'] = type;
          }
          _context.next = 10;
          return getInitialDataUrl(resource);
        case 10:
          initialDataUrl = _context.sent;
          if (initialDataUrl) {
            headers['x-first-bytes'] = initialDataUrl;
          }
          if (typeof resource === 'string') {
            resource = new TextEncoder().encode(resource);
          }
          response = new Response(resource, {
            headers: headers
          });
          Object.defineProperty(response, 'url', {
            value: url
          });
          return _context.abrupt("return", response);
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _makeResponse.apply(this, arguments);
}
function checkResponse(_x2) {
  return _checkResponse.apply(this, arguments);
}
function _checkResponse() {
  _checkResponse = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(response) {
    var message;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          if (response.ok) {
            _context2.next = 5;
            break;
          }
          _context2.next = 3;
          return getResponseError(response);
        case 3:
          message = _context2.sent;
          throw new Error(message);
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _checkResponse.apply(this, arguments);
}
function checkResponseSync(response) {
  if (!response.ok) {
    var message = "".concat(response.status, " ").concat(response.statusText);
    message = message.length > 60 ? "".concat(message.slice(0, 60), "...") : message;
    throw new Error(message);
  }
}
function getResponseError(_x3) {
  return _getResponseError.apply(this, arguments);
}
function _getResponseError() {
  _getResponseError = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(response) {
    var message, contentType, text;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          message = "Failed to fetch resource ".concat(response.url, " (").concat(response.status, "): ");
          _context3.prev = 1;
          contentType = response.headers.get('Content-Type');
          text = response.statusText;
          if (!contentType.includes('application/json')) {
            _context3.next = 11;
            break;
          }
          _context3.t0 = text;
          _context3.t1 = " ";
          _context3.next = 9;
          return response.text();
        case 9:
          _context3.t2 = _context3.sent;
          text = _context3.t0 += _context3.t1.concat.call(_context3.t1, _context3.t2);
        case 11:
          message += text;
          message = message.length > 60 ? "".concat(message.slice(0, 60), "...") : message;
          _context3.next = 17;
          break;
        case 15:
          _context3.prev = 15;
          _context3.t3 = _context3["catch"](1);
        case 17:
          return _context3.abrupt("return", message);
        case 18:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 15]]);
  }));
  return _getResponseError.apply(this, arguments);
}
function getInitialDataUrl(_x4) {
  return _getInitialDataUrl.apply(this, arguments);
}
function _getInitialDataUrl() {
  _getInitialDataUrl = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(resource) {
    var INITIAL_DATA_LENGTH, blobSlice, slice, base64;
    return _regenerator.default.wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          INITIAL_DATA_LENGTH = 5;
          if (!(typeof resource === 'string')) {
            _context4.next = 3;
            break;
          }
          return _context4.abrupt("return", "data:,".concat(resource.slice(0, INITIAL_DATA_LENGTH)));
        case 3:
          if (!(resource instanceof Blob)) {
            _context4.next = 8;
            break;
          }
          blobSlice = resource.slice(0, 5);
          _context4.next = 7;
          return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (event) {
              var _event$target;
              return resolve(event === null || event === void 0 ? void 0 : (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result);
            };
            reader.readAsDataURL(blobSlice);
          });
        case 7:
          return _context4.abrupt("return", _context4.sent);
        case 8:
          if (!(resource instanceof ArrayBuffer)) {
            _context4.next = 12;
            break;
          }
          slice = resource.slice(0, INITIAL_DATA_LENGTH);
          base64 = arrayBufferToBase64(slice);
          return _context4.abrupt("return", "data:base64,".concat(base64));
        case 12:
          return _context4.abrupt("return", null);
        case 13:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return _getInitialDataUrl.apply(this, arguments);
}
function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
//# sourceMappingURL=response-utils.js.map