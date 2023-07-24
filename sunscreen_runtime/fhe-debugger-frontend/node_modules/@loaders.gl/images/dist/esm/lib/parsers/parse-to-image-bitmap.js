import { isSVG, getBlob } from './svg-utils';
import parseToImage from './parse-to-image';
const EMPTY_OBJECT = {};
let imagebitmapOptionsSupported = true;
export default async function parseToImageBitmap(arrayBuffer, options, url) {
  let blob;
  if (isSVG(url)) {
    const image = await parseToImage(arrayBuffer, options, url);
    blob = image;
  } else {
    blob = getBlob(arrayBuffer, url);
  }
  const imagebitmapOptions = options && options.imagebitmap;
  return await safeCreateImageBitmap(blob, imagebitmapOptions);
}
async function safeCreateImageBitmap(blob) {
  let imagebitmapOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  if (isEmptyObject(imagebitmapOptions) || !imagebitmapOptionsSupported) {
    imagebitmapOptions = null;
  }
  if (imagebitmapOptions) {
    try {
      return await createImageBitmap(blob, imagebitmapOptions);
    } catch (error) {
      console.warn(error);
      imagebitmapOptionsSupported = false;
    }
  }
  return await createImageBitmap(blob);
}
function isEmptyObject(object) {
  for (const key in object || EMPTY_OBJECT) {
    return false;
  }
  return true;
}
//# sourceMappingURL=parse-to-image-bitmap.js.map