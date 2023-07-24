"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isLoaderObject = isLoaderObject;
exports.normalizeLoader = normalizeLoader;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function isLoaderObject(loader) {
  var _loader;
  if (!loader) {
    return false;
  }
  if (Array.isArray(loader)) {
    loader = loader[0];
  }
  var hasExtensions = Array.isArray((_loader = loader) === null || _loader === void 0 ? void 0 : _loader.extensions);
  return hasExtensions;
}
function normalizeLoader(loader) {
  var _loader2, _loader3;
  (0, _loaderUtils.assert)(loader, 'null loader');
  (0, _loaderUtils.assert)(isLoaderObject(loader), 'invalid loader');
  var options;
  if (Array.isArray(loader)) {
    options = loader[1];
    loader = loader[0];
    loader = _objectSpread(_objectSpread({}, loader), {}, {
      options: _objectSpread(_objectSpread({}, loader.options), options)
    });
  }
  if ((_loader2 = loader) !== null && _loader2 !== void 0 && _loader2.parseTextSync || (_loader3 = loader) !== null && _loader3 !== void 0 && _loader3.parseText) {
    loader.text = true;
  }
  if (!loader.text) {
    loader.binary = true;
  }
  return loader;
}
//# sourceMappingURL=normalize-loader.js.map