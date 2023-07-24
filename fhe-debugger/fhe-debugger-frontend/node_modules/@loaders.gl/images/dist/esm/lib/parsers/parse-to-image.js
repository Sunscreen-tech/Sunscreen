import { getBlobOrSVGDataUrl } from './svg-utils';
export default async function parseToImage(arrayBuffer, options, url) {
  const blobOrDataUrl = getBlobOrSVGDataUrl(arrayBuffer, url);
  const URL = self.URL || self.webkitURL;
  const objectUrl = typeof blobOrDataUrl !== 'string' && URL.createObjectURL(blobOrDataUrl);
  try {
    return await loadToImage(objectUrl || blobOrDataUrl, options);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
export async function loadToImage(url, options) {
  const image = new Image();
  image.src = url;
  if (options.image && options.image.decode && image.decode) {
    await image.decode();
    return image;
  }
  return await new Promise((resolve, reject) => {
    try {
      image.onload = () => resolve(image);
      image.onerror = err => reject(new Error("Could not load image ".concat(url, ": ").concat(err)));
    } catch (error) {
      reject(error);
    }
  });
}
//# sourceMappingURL=parse-to-image.js.map