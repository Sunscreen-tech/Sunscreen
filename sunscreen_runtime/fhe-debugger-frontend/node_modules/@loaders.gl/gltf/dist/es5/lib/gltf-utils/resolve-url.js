"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveUrl = resolveUrl;
function resolveUrl(url, options) {
  var absolute = url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:');
  if (absolute) {
    return url;
  }
  var baseUrl = options.baseUri || options.uri;
  if (!baseUrl) {
    throw new Error("'baseUri' must be provided to resolve relative url ".concat(url));
  }
  return baseUrl.substr(0, baseUrl.lastIndexOf('/') + 1) + url;
}
//# sourceMappingURL=resolve-url.js.map