import { isBrowser } from '@loaders.gl/loader-utils';
const {
  _parseImageNode
} = globalThis;
const IMAGE_SUPPORTED = typeof Image !== 'undefined';
const IMAGE_BITMAP_SUPPORTED = typeof ImageBitmap !== 'undefined';
const NODE_IMAGE_SUPPORTED = Boolean(_parseImageNode);
const DATA_SUPPORTED = isBrowser ? true : NODE_IMAGE_SUPPORTED;
export function isImageTypeSupported(type) {
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
export function getDefaultImageType() {
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