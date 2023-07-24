const SVG_DATA_URL_PATTERN = /^data:image\/svg\+xml/;
const SVG_URL_PATTERN = /\.svg((\?|#).*)?$/;
export function isSVG(url) {
  return url && (SVG_DATA_URL_PATTERN.test(url) || SVG_URL_PATTERN.test(url));
}
export function getBlobOrSVGDataUrl(arrayBuffer, url) {
  if (isSVG(url)) {
    const textDecoder = new TextDecoder();
    let xmlText = textDecoder.decode(arrayBuffer);
    try {
      if (typeof unescape === 'function' && typeof encodeURIComponent === 'function') {
        xmlText = unescape(encodeURIComponent(xmlText));
      }
    } catch (error) {
      throw new Error(error.message);
    }
    const src = "data:image/svg+xml;base64,".concat(btoa(xmlText));
    return src;
  }
  return getBlob(arrayBuffer, url);
}
export function getBlob(arrayBuffer, url) {
  if (isSVG(url)) {
    throw new Error('SVG cannot be parsed directly to imagebitmap');
  }
  return new Blob([new Uint8Array(arrayBuffer)]);
}
//# sourceMappingURL=svg-utils.js.map