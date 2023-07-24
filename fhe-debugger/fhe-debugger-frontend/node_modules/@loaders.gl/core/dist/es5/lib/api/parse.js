"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse = parse;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerUtils = require("@loaders.gl/worker-utils");
var _loaderUtils = require("@loaders.gl/loader-utils");
var _normalizeLoader = require("../loader-utils/normalize-loader");
var _isType = require("../../javascript-utils/is-type");
var _optionUtils = require("../loader-utils/option-utils");
var _getData = require("../loader-utils/get-data");
var _loaderContext = require("../loader-utils/loader-context");
var _resourceUtils = require("../utils/resource-utils");
var _selectLoader = require("./select-loader");
function parse(_x, _x2, _x3, _x4) {
  return _parse.apply(this, arguments);
}
function _parse() {
  _parse = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, loaders, options, context) {
    var url, typedLoaders, candidateLoaders, loader;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          (0, _workerUtils.assert)(!context || (0, _typeof2.default)(context) === 'object');
          if (loaders && !Array.isArray(loaders) && !(0, _normalizeLoader.isLoaderObject)(loaders)) {
            context = undefined;
            options = loaders;
            loaders = undefined;
          }
          _context.next = 4;
          return data;
        case 4:
          data = _context.sent;
          options = options || {};
          url = (0, _resourceUtils.getResourceUrl)(data);
          typedLoaders = loaders;
          candidateLoaders = (0, _loaderContext.getLoadersFromContext)(typedLoaders, context);
          _context.next = 11;
          return (0, _selectLoader.selectLoader)(data, candidateLoaders, options);
        case 11:
          loader = _context.sent;
          if (loader) {
            _context.next = 14;
            break;
          }
          return _context.abrupt("return", null);
        case 14:
          options = (0, _optionUtils.normalizeOptions)(options, loader, candidateLoaders, url);
          context = (0, _loaderContext.getLoaderContext)({
            url: url,
            parse: parse,
            loaders: candidateLoaders
          }, options, context || null);
          _context.next = 18;
          return parseWithLoader(loader, data, options, context);
        case 18:
          return _context.abrupt("return", _context.sent);
        case 19:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parse.apply(this, arguments);
}
function parseWithLoader(_x5, _x6, _x7, _x8) {
  return _parseWithLoader.apply(this, arguments);
}
function _parseWithLoader() {
  _parseWithLoader = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(loader, data, options, context) {
    var response, ok, redirected, status, statusText, type, url, headers;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          (0, _workerUtils.validateWorkerVersion)(loader);
          if ((0, _isType.isResponse)(data)) {
            response = data;
            ok = response.ok, redirected = response.redirected, status = response.status, statusText = response.statusText, type = response.type, url = response.url;
            headers = Object.fromEntries(response.headers.entries());
            context.response = {
              headers: headers,
              ok: ok,
              redirected: redirected,
              status: status,
              statusText: statusText,
              type: type,
              url: url
            };
          }
          _context2.next = 4;
          return (0, _getData.getArrayBufferOrStringFromData)(data, loader, options);
        case 4:
          data = _context2.sent;
          if (!(loader.parseTextSync && typeof data === 'string')) {
            _context2.next = 8;
            break;
          }
          options.dataType = 'text';
          return _context2.abrupt("return", loader.parseTextSync(data, options, context, loader));
        case 8:
          if (!(0, _loaderUtils.canParseWithWorker)(loader, options)) {
            _context2.next = 12;
            break;
          }
          _context2.next = 11;
          return (0, _loaderUtils.parseWithWorker)(loader, data, options, context, parse);
        case 11:
          return _context2.abrupt("return", _context2.sent);
        case 12:
          if (!(loader.parseText && typeof data === 'string')) {
            _context2.next = 16;
            break;
          }
          _context2.next = 15;
          return loader.parseText(data, options, context, loader);
        case 15:
          return _context2.abrupt("return", _context2.sent);
        case 16:
          if (!loader.parse) {
            _context2.next = 20;
            break;
          }
          _context2.next = 19;
          return loader.parse(data, options, context, loader);
        case 19:
          return _context2.abrupt("return", _context2.sent);
        case 20:
          (0, _workerUtils.assert)(!loader.parseSync);
          throw new Error("".concat(loader.id, " loader - no parser found and worker is disabled"));
        case 22:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _parseWithLoader.apply(this, arguments);
}
//# sourceMappingURL=parse.js.map