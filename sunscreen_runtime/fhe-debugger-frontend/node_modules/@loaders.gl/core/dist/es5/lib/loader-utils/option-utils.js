"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getGlobalLoaderOptions = void 0;
exports.getGlobalLoaderState = getGlobalLoaderState;
exports.normalizeOptions = normalizeOptions;
exports.setGlobalOptions = setGlobalOptions;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _isType = require("../../javascript-utils/is-type");
var _loggers = require("./loggers");
var _optionDefaults = require("./option-defaults");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function getGlobalLoaderState() {
  globalThis.loaders = globalThis.loaders || {};
  var loaders = globalThis.loaders;
  loaders._state = loaders._state || {};
  return loaders._state;
}
var getGlobalLoaderOptions = function getGlobalLoaderOptions() {
  var state = getGlobalLoaderState();
  state.globalOptions = state.globalOptions || _objectSpread({}, _optionDefaults.DEFAULT_LOADER_OPTIONS);
  return state.globalOptions;
};
exports.getGlobalLoaderOptions = getGlobalLoaderOptions;
function setGlobalOptions(options) {
  var state = getGlobalLoaderState();
  var globalOptions = getGlobalLoaderOptions();
  state.globalOptions = normalizeOptionsInternal(globalOptions, options);
}
function normalizeOptions(options, loader, loaders, url) {
  loaders = loaders || [];
  loaders = Array.isArray(loaders) ? loaders : [loaders];
  validateOptions(options, loaders);
  return normalizeOptionsInternal(loader, options, url);
}
function validateOptions(options, loaders) {
  validateOptionsObject(options, null, _optionDefaults.DEFAULT_LOADER_OPTIONS, _optionDefaults.REMOVED_LOADER_OPTIONS, loaders);
  var _iterator = _createForOfIteratorHelper(loaders),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var loader = _step.value;
      var idOptions = options && options[loader.id] || {};
      var loaderOptions = loader.options && loader.options[loader.id] || {};
      var deprecatedOptions = loader.deprecatedOptions && loader.deprecatedOptions[loader.id] || {};
      validateOptionsObject(idOptions, loader.id, loaderOptions, deprecatedOptions, loaders);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}
function validateOptionsObject(options, id, defaultOptions, deprecatedOptions, loaders) {
  var loaderName = id || 'Top level';
  var prefix = id ? "".concat(id, ".") : '';
  for (var key in options) {
    var isSubOptions = !id && (0, _isType.isObject)(options[key]);
    var isBaseUriOption = key === 'baseUri' && !id;
    var isWorkerUrlOption = key === 'workerUrl' && id;
    if (!(key in defaultOptions) && !isBaseUriOption && !isWorkerUrlOption) {
      if (key in deprecatedOptions) {
        _loggers.probeLog.warn("".concat(loaderName, " loader option '").concat(prefix).concat(key, "' no longer supported, use '").concat(deprecatedOptions[key], "'"))();
      } else if (!isSubOptions) {
        var suggestion = findSimilarOption(key, loaders);
        _loggers.probeLog.warn("".concat(loaderName, " loader option '").concat(prefix).concat(key, "' not recognized. ").concat(suggestion))();
      }
    }
  }
}
function findSimilarOption(optionKey, loaders) {
  var lowerCaseOptionKey = optionKey.toLowerCase();
  var bestSuggestion = '';
  var _iterator2 = _createForOfIteratorHelper(loaders),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var loader = _step2.value;
      for (var key in loader.options) {
        if (optionKey === key) {
          return "Did you mean '".concat(loader.id, ".").concat(key, "'?");
        }
        var lowerCaseKey = key.toLowerCase();
        var isPartialMatch = lowerCaseOptionKey.startsWith(lowerCaseKey) || lowerCaseKey.startsWith(lowerCaseOptionKey);
        if (isPartialMatch) {
          bestSuggestion = bestSuggestion || "Did you mean '".concat(loader.id, ".").concat(key, "'?");
        }
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return bestSuggestion;
}
function normalizeOptionsInternal(loader, options, url) {
  var loaderDefaultOptions = loader.options || {};
  var mergedOptions = _objectSpread({}, loaderDefaultOptions);
  addUrlOptions(mergedOptions, url);
  if (mergedOptions.log === null) {
    mergedOptions.log = new _loggers.NullLog();
  }
  mergeNestedFields(mergedOptions, getGlobalLoaderOptions());
  mergeNestedFields(mergedOptions, options);
  return mergedOptions;
}
function mergeNestedFields(mergedOptions, options) {
  for (var key in options) {
    if (key in options) {
      var value = options[key];
      if ((0, _isType.isPureObject)(value) && (0, _isType.isPureObject)(mergedOptions[key])) {
        mergedOptions[key] = _objectSpread(_objectSpread({}, mergedOptions[key]), options[key]);
      } else {
        mergedOptions[key] = options[key];
      }
    }
  }
}
function addUrlOptions(options, url) {
  if (url && !('baseUri' in options)) {
    options.baseUri = url;
  }
}
//# sourceMappingURL=option-utils.js.map