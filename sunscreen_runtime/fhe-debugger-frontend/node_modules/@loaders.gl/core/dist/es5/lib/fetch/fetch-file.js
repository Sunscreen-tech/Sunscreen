"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchFile = fetchFile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _responseUtils = require("../utils/response-utils");
function fetchFile(_x, _x2) {
  return _fetchFile.apply(this, arguments);
}
function _fetchFile() {
  _fetchFile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(url, options) {
    var fetchOptions;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(typeof url === 'string')) {
            _context.next = 7;
            break;
          }
          url = (0, _loaderUtils.resolvePath)(url);
          fetchOptions = options;
          if (options !== null && options !== void 0 && options.fetch && typeof (options === null || options === void 0 ? void 0 : options.fetch) !== 'function') {
            fetchOptions = options.fetch;
          }
          _context.next = 6;
          return fetch(url, fetchOptions);
        case 6:
          return _context.abrupt("return", _context.sent);
        case 7:
          _context.next = 9;
          return (0, _responseUtils.makeResponse)(url);
        case 9:
          return _context.abrupt("return", _context.sent);
        case 10:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _fetchFile.apply(this, arguments);
}
//# sourceMappingURL=fetch-file.js.map