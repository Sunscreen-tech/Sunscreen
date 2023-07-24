"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteImage = deleteImage;
exports.getImageData = getImageData;
exports.getImageSize = getImageSize;
exports.getImageType = getImageType;
exports.isImage = isImage;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function isImage(image) {
  return Boolean(getImageTypeOrNull(image));
}
function deleteImage(image) {
  switch (getImageType(image)) {
    case 'imagebitmap':
      image.close();
      break;
    default:
  }
}
function getImageType(image) {
  var format = getImageTypeOrNull(image);
  if (!format) {
    throw new Error('Not an image');
  }
  return format;
}
function getImageSize(image) {
  return getImageData(image);
}
function getImageData(image) {
  switch (getImageType(image)) {
    case 'data':
      return image;
    case 'image':
    case 'imagebitmap':
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      if (!context) {
        throw new Error('getImageData');
      }
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height);
    default:
      throw new Error('getImageData');
  }
}
function getImageTypeOrNull(image) {
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    return 'imagebitmap';
  }
  if (typeof Image !== 'undefined' && image instanceof Image) {
    return 'image';
  }
  if (image && (0, _typeof2.default)(image) === 'object' && image.data && image.width && image.height) {
    return 'data';
  }
  return null;
}
//# sourceMappingURL=parsed-image-api.js.map