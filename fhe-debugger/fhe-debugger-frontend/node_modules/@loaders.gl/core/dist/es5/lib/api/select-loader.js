"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectLoader = selectLoader;
exports.selectLoaderSync = selectLoaderSync;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _normalizeLoader = require("../loader-utils/normalize-loader");
var _log = require("../utils/log");
var _resourceUtils = require("../utils/resource-utils");
var _registerLoaders = require("./register-loaders");
var _isType = require("../../javascript-utils/is-type");
var _urlUtils = require("../utils/url-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var EXT_PATTERN = /\.([^.]+)$/;
function selectLoader(_x) {
  return _selectLoader.apply(this, arguments);
}
function _selectLoader() {
  _selectLoader = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data) {
    var loaders,
      options,
      context,
      loader,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          loaders = _args.length > 1 && _args[1] !== undefined ? _args[1] : [];
          options = _args.length > 2 ? _args[2] : undefined;
          context = _args.length > 3 ? _args[3] : undefined;
          if (validHTTPResponse(data)) {
            _context.next = 5;
            break;
          }
          return _context.abrupt("return", null);
        case 5:
          loader = selectLoaderSync(data, loaders, _objectSpread(_objectSpread({}, options), {}, {
            nothrow: true
          }), context);
          if (!loader) {
            _context.next = 8;
            break;
          }
          return _context.abrupt("return", loader);
        case 8:
          if (!(0, _isType.isBlob)(data)) {
            _context.next = 13;
            break;
          }
          _context.next = 11;
          return data.slice(0, 10).arrayBuffer();
        case 11:
          data = _context.sent;
          loader = selectLoaderSync(data, loaders, options, context);
        case 13:
          if (!(!loader && !(options !== null && options !== void 0 && options.nothrow))) {
            _context.next = 15;
            break;
          }
          throw new Error(getNoValidLoaderMessage(data));
        case 15:
          return _context.abrupt("return", loader);
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _selectLoader.apply(this, arguments);
}
function selectLoaderSync(data) {
  var loaders = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var options = arguments.length > 2 ? arguments[2] : undefined;
  var context = arguments.length > 3 ? arguments[3] : undefined;
  if (!validHTTPResponse(data)) {
    return null;
  }
  if (loaders && !Array.isArray(loaders)) {
    return (0, _normalizeLoader.normalizeLoader)(loaders);
  }
  var candidateLoaders = [];
  if (loaders) {
    candidateLoaders = candidateLoaders.concat(loaders);
  }
  if (!(options !== null && options !== void 0 && options.ignoreRegisteredLoaders)) {
    var _candidateLoaders;
    (_candidateLoaders = candidateLoaders).push.apply(_candidateLoaders, (0, _toConsumableArray2.default)((0, _registerLoaders.getRegisteredLoaders)()));
  }
  normalizeLoaders(candidateLoaders);
  var loader = selectLoaderInternal(data, candidateLoaders, options, context);
  if (!loader && !(options !== null && options !== void 0 && options.nothrow)) {
    throw new Error(getNoValidLoaderMessage(data));
  }
  return loader;
}
function selectLoaderInternal(data, loaders, options, context) {
  var url = (0, _resourceUtils.getResourceUrl)(data);
  var type = (0, _resourceUtils.getResourceMIMEType)(data);
  var testUrl = (0, _urlUtils.stripQueryString)(url) || (context === null || context === void 0 ? void 0 : context.url);
  var loader = null;
  var reason = '';
  if (options !== null && options !== void 0 && options.mimeType) {
    loader = findLoaderByMIMEType(loaders, options === null || options === void 0 ? void 0 : options.mimeType);
    reason = "match forced by supplied MIME type ".concat(options === null || options === void 0 ? void 0 : options.mimeType);
  }
  loader = loader || findLoaderByUrl(loaders, testUrl);
  reason = reason || (loader ? "matched url ".concat(testUrl) : '');
  loader = loader || findLoaderByMIMEType(loaders, type);
  reason = reason || (loader ? "matched MIME type ".concat(type) : '');
  loader = loader || findLoaderByInitialBytes(loaders, data);
  reason = reason || (loader ? "matched initial data ".concat(getFirstCharacters(data)) : '');
  loader = loader || findLoaderByMIMEType(loaders, options === null || options === void 0 ? void 0 : options.fallbackMimeType);
  reason = reason || (loader ? "matched fallback MIME type ".concat(type) : '');
  if (reason) {
    var _loader;
    _log.log.log(1, "selectLoader selected ".concat((_loader = loader) === null || _loader === void 0 ? void 0 : _loader.name, ": ").concat(reason, "."));
  }
  return loader;
}
function validHTTPResponse(data) {
  if (data instanceof Response) {
    if (data.status === 204) {
      return false;
    }
  }
  return true;
}
function getNoValidLoaderMessage(data) {
  var url = (0, _resourceUtils.getResourceUrl)(data);
  var type = (0, _resourceUtils.getResourceMIMEType)(data);
  var message = 'No valid loader found (';
  message += url ? "".concat(_loaderUtils.path.filename(url), ", ") : 'no url provided, ';
  message += "MIME type: ".concat(type ? "\"".concat(type, "\"") : 'not provided', ", ");
  var firstCharacters = data ? getFirstCharacters(data) : '';
  message += firstCharacters ? " first bytes: \"".concat(firstCharacters, "\"") : 'first bytes: not available';
  message += ')';
  return message;
}
function normalizeLoaders(loaders) {
  var _iterator = _createForOfIteratorHelper(loaders),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var loader = _step.value;
      (0, _normalizeLoader.normalizeLoader)(loader);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}
function findLoaderByUrl(loaders, url) {
  var match = url && EXT_PATTERN.exec(url);
  var extension = match && match[1];
  return extension ? findLoaderByExtension(loaders, extension) : null;
}
function findLoaderByExtension(loaders, extension) {
  extension = extension.toLowerCase();
  var _iterator2 = _createForOfIteratorHelper(loaders),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var loader = _step2.value;
      var _iterator3 = _createForOfIteratorHelper(loader.extensions),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var loaderExtension = _step3.value;
          if (loaderExtension.toLowerCase() === extension) {
            return loader;
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return null;
}
function findLoaderByMIMEType(loaders, mimeType) {
  var _iterator4 = _createForOfIteratorHelper(loaders),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var loader = _step4.value;
      if (loader.mimeTypes && loader.mimeTypes.includes(mimeType)) {
        return loader;
      }
      if (mimeType === "application/x.".concat(loader.id)) {
        return loader;
      }
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  return null;
}
function findLoaderByInitialBytes(loaders, data) {
  if (!data) {
    return null;
  }
  var _iterator5 = _createForOfIteratorHelper(loaders),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var loader = _step5.value;
      if (typeof data === 'string') {
        if (testDataAgainstText(data, loader)) {
          return loader;
        }
      } else if (ArrayBuffer.isView(data)) {
        if (testDataAgainstBinary(data.buffer, data.byteOffset, loader)) {
          return loader;
        }
      } else if (data instanceof ArrayBuffer) {
        var byteOffset = 0;
        if (testDataAgainstBinary(data, byteOffset, loader)) {
          return loader;
        }
      }
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }
  return null;
}
function testDataAgainstText(data, loader) {
  if (loader.testText) {
    return loader.testText(data);
  }
  var tests = Array.isArray(loader.tests) ? loader.tests : [loader.tests];
  return tests.some(function (test) {
    return data.startsWith(test);
  });
}
function testDataAgainstBinary(data, byteOffset, loader) {
  var tests = Array.isArray(loader.tests) ? loader.tests : [loader.tests];
  return tests.some(function (test) {
    return testBinary(data, byteOffset, loader, test);
  });
}
function testBinary(data, byteOffset, loader, test) {
  if (test instanceof ArrayBuffer) {
    return (0, _loaderUtils.compareArrayBuffers)(test, data, test.byteLength);
  }
  switch ((0, _typeof2.default)(test)) {
    case 'function':
      return test(data, loader);
    case 'string':
      var magic = getMagicString(data, byteOffset, test.length);
      return test === magic;
    default:
      return false;
  }
}
function getFirstCharacters(data) {
  var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5;
  if (typeof data === 'string') {
    return data.slice(0, length);
  } else if (ArrayBuffer.isView(data)) {
    return getMagicString(data.buffer, data.byteOffset, length);
  } else if (data instanceof ArrayBuffer) {
    var byteOffset = 0;
    return getMagicString(data, byteOffset, length);
  }
  return '';
}
function getMagicString(arrayBuffer, byteOffset, length) {
  if (arrayBuffer.byteLength < byteOffset + length) {
    return '';
  }
  var dataView = new DataView(arrayBuffer);
  var magic = '';
  for (var i = 0; i < length; i++) {
    magic += String.fromCharCode(dataView.getUint8(byteOffset + i));
  }
  return magic;
}
//# sourceMappingURL=select-loader.js.map