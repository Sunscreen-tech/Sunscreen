import { ImageLoader } from '@loaders.gl/images';
import { getImageUrls } from './load-image';
import { deepLoad } from './deep-load';
export async function loadImageTextureArray(count, getUrl) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const imageUrls = await getImageArrayUrls(count, getUrl, options);
  return await deepLoad(imageUrls, ImageLoader.parse, options);
}
export async function getImageArrayUrls(count, getUrl) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const promises = [];
  for (let index = 0; index < count; index++) {
    const promise = getImageUrls(getUrl, options, {
      index
    });
    promises.push(promise);
  }
  return await Promise.all(promises);
}
//# sourceMappingURL=load-image-array.js.map