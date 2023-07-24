import { assert } from '@loaders.gl/loader-utils';
import { isImageTypeSupported, getDefaultImageType } from '../category-api/image-type';
import { getImageData } from '../category-api/parsed-image-api';
import parseToImage from './parse-to-image';
import parseToImageBitmap from './parse-to-image-bitmap';
import parseToNodeImage from './parse-to-node-image';
export default async function parseImage(arrayBuffer, options, context) {
  options = options || {};
  const imageOptions = options.image || {};
  const imageType = imageOptions.type || 'auto';
  const {
    url
  } = context || {};
  const loadType = getLoadableImageType(imageType);
  let image;
  switch (loadType) {
    case 'imagebitmap':
      image = await parseToImageBitmap(arrayBuffer, options, url);
      break;
    case 'image':
      image = await parseToImage(arrayBuffer, options, url);
      break;
    case 'data':
      image = await parseToNodeImage(arrayBuffer, options);
      break;
    default:
      assert(false);
  }
  if (imageType === 'data') {
    image = getImageData(image);
  }
  return image;
}
function getLoadableImageType(type) {
  switch (type) {
    case 'auto':
    case 'data':
      return getDefaultImageType();
    default:
      isImageTypeSupported(type);
      return type;
  }
}
//# sourceMappingURL=parse-image.js.map