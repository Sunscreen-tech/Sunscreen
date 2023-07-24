"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractQueryString = extractQueryString;
exports.stripQueryString = stripQueryString;
var QUERY_STRING_PATTERN = /\?.*/;
function extractQueryString(url) {
  var matches = url.match(QUERY_STRING_PATTERN);
  return matches && matches[0];
}
function stripQueryString(url) {
  return url.replace(QUERY_STRING_PATTERN, '');
}
//# sourceMappingURL=url-utils.js.map