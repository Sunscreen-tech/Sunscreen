"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLoaderContext = getLoaderContext;
exports.getLoadersFromContext = getLoadersFromContext;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _getFetchFunction = require("./get-fetch-function");
var _urlUtils = require("../utils/url-utils");
var _loaderUtils = require("@loaders.gl/loader-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function getLoaderContext(context, options, parentContext) {
  if (parentContext) {
    return parentContext;
  }
  var newContext = _objectSpread({
    fetch: (0, _getFetchFunction.getFetchFunction)(options, context)
  }, context);
  if (newContext.url) {
    var baseUrl = (0, _urlUtils.stripQueryString)(newContext.url);
    newContext.baseUrl = baseUrl;
    newContext.queryString = (0, _urlUtils.extractQueryString)(newContext.url);
    newContext.filename = _loaderUtils.path.filename(baseUrl);
    newContext.baseUrl = _loaderUtils.path.dirname(baseUrl);
  }
  if (!Array.isArray(newContext.loaders)) {
    newContext.loaders = null;
  }
  return newContext;
}
function getLoadersFromContext(loaders, context) {
  if (!context && loaders && !Array.isArray(loaders)) {
    return loaders;
  }
  var candidateLoaders;
  if (loaders) {
    candidateLoaders = Array.isArray(loaders) ? loaders : [loaders];
  }
  if (context && context.loaders) {
    var contextLoaders = Array.isArray(context.loaders) ? context.loaders : [context.loaders];
    candidateLoaders = candidateLoaders ? [].concat((0, _toConsumableArray2.default)(candidateLoaders), (0, _toConsumableArray2.default)(contextLoaders)) : contextLoaders;
  }
  return candidateLoaders && candidateLoaders.length ? candidateLoaders : null;
}
//# sourceMappingURL=loader-context.js.map