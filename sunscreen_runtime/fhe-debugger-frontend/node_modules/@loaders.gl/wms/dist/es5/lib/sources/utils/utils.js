"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFetchFunction = getFetchFunction;
exports.mergeImageServiceProps = mergeImageServiceProps;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function getFetchFunction(options) {
  var fetchFunction = options === null || options === void 0 ? void 0 : options.fetch;
  if (fetchFunction && typeof fetchFunction === 'function') {
    return function (url, fetchOptions) {
      return fetchFunction(url, fetchOptions);
    };
  }
  var fetchOptions = options === null || options === void 0 ? void 0 : options.fetch;
  if (fetchOptions && typeof fetchOptions !== 'function') {
    return function (url) {
      return fetch(url, fetchOptions);
    };
  }
  return function (url) {
    return fetch(url);
  };
}
function mergeImageServiceProps(props) {
  return _objectSpread(_objectSpread({}, props), {}, {
    loadOptions: _objectSpread(_objectSpread({}, props.loadOptions), {}, {
      fetch: getFetchFunction(props.loadOptions)
    })
  });
}
//# sourceMappingURL=utils.js.map