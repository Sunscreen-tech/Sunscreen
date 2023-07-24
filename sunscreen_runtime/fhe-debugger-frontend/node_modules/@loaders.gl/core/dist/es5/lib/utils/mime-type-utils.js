"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseMIMEType = parseMIMEType;
exports.parseMIMETypeFromURL = parseMIMETypeFromURL;
var DATA_URL_PATTERN = /^data:([-\w.]+\/[-\w.+]+)(;|,)/;
var MIME_TYPE_PATTERN = /^([-\w.]+\/[-\w.+]+)/;
function parseMIMEType(mimeString) {
  var matches = MIME_TYPE_PATTERN.exec(mimeString);
  if (matches) {
    return matches[1];
  }
  return mimeString;
}
function parseMIMETypeFromURL(url) {
  var matches = DATA_URL_PATTERN.exec(url);
  if (matches) {
    return matches[1];
  }
  return '';
}
//# sourceMappingURL=mime-type-utils.js.map