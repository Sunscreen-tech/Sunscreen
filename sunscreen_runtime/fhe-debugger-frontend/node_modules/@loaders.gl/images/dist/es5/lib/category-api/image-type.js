"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDefaultImageType = getDefaultImageType;
exports.isImageTypeSupported = isImageTypeSupported;
var _loaderUtils = require("@loaders.gl/loader-utils");
var _parseImageNode = globalThis._parseImageNode;
var IMAGE_SUPPORTED = typeof Image !== 'undefined';
var IMAGE_BITMAP_SUPPORTED = typeof ImageBitmap !== 'undefined';
var NODE_IMAGE_SUPPORTED = Boolean(_parseImageNode);
var DATA_SUPPORTED = _loaderUtils.isBrowser ? true : NODE_IMAGE_SUPPORTED;
function isImageTypeSupported(type) {
  switch (type) {
    case 'auto':
      return IMAGE_BITMAP_SUPPORTED || IMAGE_SUPPORTED || DATA_SUPPORTED;
    case 'imagebitmap':
      return IMAGE_BITMAP_SUPPORTED;
    case 'image':
      return IMAGE_SUPPORTED;
    case 'data':
      return DATA_SUPPORTED;
    default:
      throw new Error("@loaders.gl/images: image ".concat(type, " not supported in this environment"));
  }
}
function getDefaultImageType() {
  if (IMAGE_BITMAP_SUPPORTED) {
    return 'imagebitmap';
  }
  if (IMAGE_SUPPORTED) {
    return 'image';
  }
  if (DATA_SUPPORTED) {
    return 'data';
  }
  throw new Error('Install \'@loaders.gl/polyfills\' to parse images under Node.js');
}
//# sourceMappingURL=image-type.js.map