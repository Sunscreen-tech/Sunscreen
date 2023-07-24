import { getImageSize } from '../category-api/parsed-image-api';
const {
  _encodeImageNode
} = globalThis;
export async function encodeImage(image, options) {
  options = options || {};
  options.image = options.image || {};
  return _encodeImageNode ? _encodeImageNode(image, {
    type: options.image.mimeType
  }) : encodeImageInBrowser(image, options);
}
let qualityParamSupported = true;
async function encodeImageInBrowser(image, options) {
  const {
    mimeType,
    jpegQuality
  } = options.image;
  const {
    width,
    height
  } = getImageSize(image);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawImageToCanvas(image, canvas);
  const blob = await new Promise(resolve => {
    if (jpegQuality && qualityParamSupported) {
      try {
        canvas.toBlob(resolve, mimeType, jpegQuality);
        return;
      } catch (error) {
        qualityParamSupported = false;
      }
    }
    canvas.toBlob(resolve, mimeType);
  });
  if (!blob) {
    throw new Error('image encoding failed');
  }
  return await blob.arrayBuffer();
}
function drawImageToCanvas(image, canvas) {
  let x = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  let y = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  if (x === 0 && y === 0 && typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    const context = canvas.getContext('bitmaprenderer');
    if (context) {
      context.transferFromImageBitmap(image);
      return canvas;
    }
  }
  const context = canvas.getContext('2d');
  if (image.data) {
    const clampedArray = new Uint8ClampedArray(image.data);
    const imageData = new ImageData(clampedArray, image.width, image.height);
    context.putImageData(imageData, 0, 0);
    return canvas;
  }
  context.drawImage(image, 0, 0);
  return canvas;
}
//# sourceMappingURL=encode-image.js.map