import { assert } from '@loaders.gl/loader-utils';
import parseImage from '../parsers/parse-image';
import { getImageSize } from '../category-api/parsed-image-api';
import { generateUrl } from './generate-url';
import { deepLoad, shallowLoad } from './deep-load';
export async function loadImage(getUrl) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const imageUrls = await getImageUrls(getUrl, options);
  return await deepLoad(imageUrls, parseImage, options);
}
export async function getImageUrls(getUrl, options) {
  let urlOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const mipLevels = options && options.image && options.image.mipLevels || 0;
  return mipLevels !== 0 ? await getMipmappedImageUrls(getUrl, mipLevels, options, urlOptions) : generateUrl(getUrl, options, urlOptions);
}
async function getMipmappedImageUrls(getUrl, mipLevels, options, urlOptions) {
  const urls = [];
  if (mipLevels === 'auto') {
    const url = generateUrl(getUrl, options, {
      ...urlOptions,
      lod: 0
    });
    const image = await shallowLoad(url, parseImage, options);
    const {
      width,
      height
    } = getImageSize(image);
    mipLevels = getMipLevels({
      width,
      height
    });
    urls.push(url);
  }
  assert(mipLevels > 0);
  for (let mipLevel = urls.length; mipLevel < mipLevels; ++mipLevel) {
    const url = generateUrl(getUrl, options, {
      ...urlOptions,
      lod: mipLevel
    });
    urls.push(url);
  }
  return urls;
}
export function getMipLevels(_ref) {
  let {
    width,
    height
  } = _ref;
  return 1 + Math.floor(Math.log2(Math.max(width, height)));
}
//# sourceMappingURL=load-image.js.map