import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { ImageLoader } from '@loaders.gl/images';
import { ImageSource } from '../../sources/image-source';
export class ImageService extends ImageSource {
  constructor(props) {
    super(props);
  }
  async getMetadata() {
    throw new Error('ImageSource.getMetadata not implemented');
  }
  async getImage(parameters) {
    const granularParameters = this.getGranularParameters(parameters);
    const url = this.getURLFromTemplate(granularParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await ImageLoader.parse(arrayBuffer);
  }
  getGranularParameters(parameters) {
    const [east, north, west, south] = parameters.bbox;
    return {
      ...parameters,
      east,
      north,
      south,
      west
    };
  }
  getURLFromTemplate(parameters) {
    let url = this.props.url;
    for (const [key, value] of Object.entries(parameters)) {
      url = url.replace("${".concat(key, "}"), String(value));
      url = url.replace("{".concat(key, "}"), String(value));
    }
    return url;
  }
}
_defineProperty(ImageService, "type", 'template');
_defineProperty(ImageService, "testURL", url => url.toLowerCase().includes('{'));
//# sourceMappingURL=image-service.js.map