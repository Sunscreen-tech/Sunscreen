"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseSync = parseSync;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _selectLoader = require("./select-loader");
var _normalizeLoader = require("../loader-utils/normalize-loader");
var _optionUtils = require("../loader-utils/option-utils");
var _getData = require("../loader-utils/get-data");
var _loaderContext = require("../loader-utils/loader-context");
var _resourceUtils = require("../utils/resource-utils");
function parseSync(data, loaders, options, context) {
  (0, _loaderUtils.assert)(!context || (0, _typeof2.default)(context) === 'object');
  if (!Array.isArray(loaders) && !(0, _normalizeLoader.isLoaderObject)(loaders)) {
    context = undefined;
    options = loaders;
    loaders = undefined;
  }
  options = options || {};
  var typedLoaders = loaders;
  var candidateLoaders = (0, _loaderContext.getLoadersFromContext)(typedLoaders, context);
  var loader = (0, _selectLoader.selectLoaderSync)(data, candidateLoaders, options);
  if (!loader) {
    return null;
  }
  options = (0, _optionUtils.normalizeOptions)(options, loader, candidateLoaders);
  var url = (0, _resourceUtils.getResourceUrl)(data);
  var parse = function parse() {
    throw new Error('parseSync called parse (which is async');
  };
  context = (0, _loaderContext.getLoaderContext)({
    url: url,
    parseSync: parseSync,
    parse: parse,
    loaders: loaders
  }, options, context || null);
  return parseWithLoaderSync(loader, data, options, context);
}
function parseWithLoaderSync(loader, data, options, context) {
  data = (0, _getData.getArrayBufferOrStringFromDataSync)(data, loader, options);
  if (loader.parseTextSync && typeof data === 'string') {
    return loader.parseTextSync(data, options);
  }
  if (loader.parseSync && data instanceof ArrayBuffer) {
    return loader.parseSync(data, options, context);
  }
  throw new Error("".concat(loader.name, " loader: 'parseSync' not supported by this loader, use 'parse' instead. ").concat(context.url || ''));
}
//# sourceMappingURL=parse-sync.js.map