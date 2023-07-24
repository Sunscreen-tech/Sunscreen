export function isImage(image) {
  return Boolean(getImageTypeOrNull(image));
}
export function deleteImage(image) {
  switch (getImageType(image)) {
    case 'imagebitmap':
      image.close();
      break;
    default:
  }
}
export function getImageType(image) {
  const format = getImageTypeOrNull(image);
  if (!format) {
    throw new Error('Not an image');
  }
  return format;
}
export function getImageSize(image) {
  return getImageData(image);
}
export function getImageData(image) {
  switch (getImageType(image)) {
    case 'data':
      return image;
    case 'image':
    case 'imagebitmap':
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
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
  if (image && typeof image === 'object' && image.data && image.width && image.height) {
    return 'data';
  }
  return null;
}
//# sourceMappingURL=parsed-image-api.js.map