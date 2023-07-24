"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFetchFunction = getFetchFunction;
var _isType = require("../../javascript-utils/is-type");
var _fetchFile = require("../fetch/fetch-file");
var _optionUtils = require("./option-utils");
function getFetchFunction(options, context) {
  var globalOptions = (0, _optionUtils.getGlobalLoaderOptions)();
  var fetchOptions = options || globalOptions;
  if (typeof fetchOptions.fetch === 'function') {
    return fetchOptions.fetch;
  }
  if ((0, _isType.isObject)(fetchOptions.fetch)) {
    return function (url) {
      return (0, _fetchFile.fetchFile)(url, fetchOptions);
    };
  }
  if (context !== null && context !== void 0 && context.fetch) {
    return context === null || context === void 0 ? void 0 : context.fetch;
  }
  return _fetchFile.fetchFile;
}
//# sourceMappingURL=get-fetch-function.js.map