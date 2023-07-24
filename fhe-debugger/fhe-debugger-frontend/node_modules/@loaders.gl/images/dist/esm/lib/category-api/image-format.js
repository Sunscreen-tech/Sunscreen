import { isBrowser } from '@loaders.gl/loader-utils';
const MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/tiff', 'image/svg', 'image/svg+xml', 'image/bmp', 'image/vnd.microsoft.icon'];
const mimeTypeSupportedPromise = null;
export async function getSupportedImageFormats() {
  if (mimeTypeSupportedPromise) {
    return await mimeTypeSupportedPromise;
  }
  const supportedMimeTypes = new Set();
  for (const mimeType of MIME_TYPES) {
    const supported = isBrowser ? await checkBrowserImageFormatSupportAsync(mimeType) : checkNodeImageFormatSupport(mimeType);
    if (supported) {
      supportedMimeTypes.add(mimeType);
    }
  }
  return supportedMimeTypes;
}
const mimeTypeSupportedSync = {};
export function isImageFormatSupported(mimeType) {
  if (mimeTypeSupportedSync[mimeType] === undefined) {
    const supported = isBrowser ? checkBrowserImageFormatSupport(mimeType) : checkNodeImageFormatSupport(mimeType);
    mimeTypeSupportedSync[mimeType] = supported;
  }
  return mimeTypeSupportedSync[mimeType];
}
function checkNodeImageFormatSupport(mimeType) {
  const NODE_FORMAT_SUPPORT = ['image/png', 'image/jpeg', 'image/gif'];
  const {
    _parseImageNode,
    _imageFormatsNode = NODE_FORMAT_SUPPORT
  } = globalThis;
  return Boolean(_parseImageNode) && _imageFormatsNode.includes(mimeType);
}
function checkBrowserImageFormatSupport(mimeType) {
  switch (mimeType) {
    case 'image/avif':
    case 'image/webp':
      return testBrowserImageFormatSupport(mimeType);
    default:
      return true;
  }
}
const TEST_IMAGE = {
  'image/avif': 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=',
  'image/webp': 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
};
async function checkBrowserImageFormatSupportAsync(mimeType) {
  const dataURL = TEST_IMAGE[mimeType];
  return dataURL ? await testBrowserImageFormatSupportAsync(dataURL) : true;
}
function testBrowserImageFormatSupport(mimeType) {
  try {
    const element = document.createElement('canvas');
    const dataURL = element.toDataURL(mimeType);
    return dataURL.indexOf("data:".concat(mimeType)) === 0;
  } catch {
    return false;
  }
}
async function testBrowserImageFormatSupportAsync(testImageDataURL) {
  return new Promise(resolve => {
    const image = new Image();
    image.src = testImageDataURL;
    image.onload = () => resolve(image.height > 0);
    image.onerror = () => resolve(false);
  });
}
//# sourceMappingURL=image-format.js.map