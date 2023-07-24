"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readFileSync = readFileSync;
var _loaderUtils = require("@loaders.gl/loader-utils");
function readFileSync(url) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  url = (0, _loaderUtils.resolvePath)(url);
  if (!_loaderUtils.isBrowser) {
    var buffer = _loaderUtils.fs.readFileSync(url, options);
    return typeof buffer !== 'string' ? (0, _loaderUtils.toArrayBuffer)(buffer) : buffer;
  }
  if (!options.nothrow) {
    (0, _loaderUtils.assert)(false);
  }
  return null;
}
//# sourceMappingURL=read-file.js.map