"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadInBatches = loadInBatches;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _normalizeLoader = require("../loader-utils/normalize-loader");
var _getFetchFunction = require("../loader-utils/get-fetch-function");
var _parseInBatches = require("./parse-in-batches");
function loadInBatches(files, loaders, options, context) {
  if (!Array.isArray(loaders) && !(0, _normalizeLoader.isLoaderObject)(loaders)) {
    context = undefined;
    options = loaders;
    loaders = null;
  }
  var fetch = (0, _getFetchFunction.getFetchFunction)(options || {});
  if (!Array.isArray(files)) {
    return loadOneFileInBatches(files, loaders, options, fetch);
  }
  var promises = files.map(function (file) {
    return loadOneFileInBatches(file, loaders, options, fetch);
  });
  return promises;
}
function loadOneFileInBatches(_x, _x2, _x3, _x4) {
  return _loadOneFileInBatches.apply(this, arguments);
}
function _loadOneFileInBatches() {
  _loadOneFileInBatches = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(file, loaders, options, fetch) {
    var url, response;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(typeof file === 'string')) {
            _context.next = 8;
            break;
          }
          url = file;
          _context.next = 4;
          return fetch(url);
        case 4:
          response = _context.sent;
          _context.next = 7;
          return (0, _parseInBatches.parseInBatches)(response, loaders, options);
        case 7:
          return _context.abrupt("return", _context.sent);
        case 8:
          _context.next = 10;
          return (0, _parseInBatches.parseInBatches)(file, loaders, options);
        case 10:
          return _context.abrupt("return", _context.sent);
        case 11:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _loadOneFileInBatches.apply(this, arguments);
}
//# sourceMappingURL=load-in-batches.js.map