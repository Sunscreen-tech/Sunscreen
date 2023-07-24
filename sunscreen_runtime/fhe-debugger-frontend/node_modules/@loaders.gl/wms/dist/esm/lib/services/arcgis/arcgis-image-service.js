import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { ImageSource } from '../../sources/image-source';
export class ArcGISImageServer extends ImageSource {
  constructor(props) {
    super(props);
  }
  async getMetadata() {
    return await this.metadata();
  }
  async getImage(parameters) {
    throw new Error('not implemented');
  }
  async metadata() {
    throw new Error('not implemented');
  }
  exportImage(options) {
    throw new Error('not implemented');
  }
  metadataURL(options) {
    return "".concat(this.props.url, "?f=pjson");
  }
  exportImageURL(options) {
    const bbox = "bbox=".concat(options.bbox[0], ",").concat(options.bbox[1], ",").concat(options.bbox[2], ",").concat(options.bbox[3]);
    const size = "size=".concat(options.width, ",").concat(options.height);
    const arcgisOptions = {
      ...options,
      bbox,
      size
    };
    delete arcgisOptions.width;
    delete arcgisOptions.height;
    return this.getUrl('exportImage', arcgisOptions);
  }
  getUrl(path, options, extra) {
    let url = "".concat(this.props.url, "/").concat(path);
    let first = true;
    for (const [key, value] of Object.entries(options)) {
      url += first ? '?' : '&';
      first = false;
      if (Array.isArray(value)) {
        url += "".concat(key.toUpperCase(), "=").concat(value.join(','));
      } else {
        url += "".concat(key.toUpperCase(), "=").concat(value ? String(value) : '');
      }
    }
    return url;
  }
  async checkResponse(response) {
    if (!response.ok) {
      throw new Error('error');
    }
  }
}
_defineProperty(ArcGISImageServer, "type", 'arcgis-image-server');
_defineProperty(ArcGISImageServer, "testURL", url => url.toLowerCase().includes('ImageServer'));
//# sourceMappingURL=arcgis-image-service.js.map