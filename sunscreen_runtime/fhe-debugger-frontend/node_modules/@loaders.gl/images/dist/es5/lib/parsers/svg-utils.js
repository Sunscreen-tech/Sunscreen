"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBlob = getBlob;
exports.getBlobOrSVGDataUrl = getBlobOrSVGDataUrl;
exports.isSVG = isSVG;
var SVG_DATA_URL_PATTERN = /^data:image\/svg\+xml/;
var SVG_URL_PATTERN = /\.svg((\?|#).*)?$/;
function isSVG(url) {
  return url && (SVG_DATA_URL_PATTERN.test(url) || SVG_URL_PATTERN.test(url));
}
function getBlobOrSVGDataUrl(arrayBuffer, url) {
  if (isSVG(url)) {
    var textDecoder = new TextDecoder();
    var xmlText = textDecoder.decode(arrayBuffer);
    try {
      if (typeof unescape === 'function' && typeof encodeURIComponent === 'function') {
        xmlText = unescape(encodeURIComponent(xmlText));
      }
    } catch (error) {
      throw new Error(error.message);
    }
    var src = "data:image/svg+xml;base64,".concat(btoa(xmlText));
    return src;
  }
  return getBlob(arrayBuffer, url);
}
function getBlob(arrayBuffer, url) {
  if (isSVG(url)) {
    throw new Error('SVG cannot be parsed directly to imagebitmap');
  }
  return new Blob([new Uint8Array(arrayBuffer)]);
}
//# sourceMappingURL=svg-utils.js.map