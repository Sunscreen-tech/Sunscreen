"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateUrl = generateUrl;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function generateUrl(getUrl, options, urlOptions) {
  var url = getUrl;
  if (typeof getUrl === 'function') {
    url = getUrl(_objectSpread(_objectSpread({}, options), urlOptions));
  }
  (0, _loaderUtils.assert)(typeof url === 'string');
  var baseUrl = options.baseUrl;
  if (baseUrl) {
    url = baseUrl[baseUrl.length - 1] === '/' ? "".concat(baseUrl).concat(url) : "".concat(baseUrl, "/").concat(url);
  }
  return (0, _loaderUtils.resolvePath)(url);
}
//# sourceMappingURL=generate-url.js.map