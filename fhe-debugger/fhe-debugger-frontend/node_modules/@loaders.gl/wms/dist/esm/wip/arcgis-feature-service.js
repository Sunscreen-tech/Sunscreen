import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
export class ArcGISFeatureService {
  constructor(props) {
    _defineProperty(this, "url", void 0);
    _defineProperty(this, "loadOptions", void 0);
    _defineProperty(this, "fetch", void 0);
    this.url = props.url;
    this.loadOptions = props.loadOptions || {};
    this.fetch = props.fetch || fetch;
  }
  metadataURL(options) {
    return this.getUrl({
      ...options
    });
  }
  exportImageURL(options) {
    const {
      boundingBox
    } = options;
    return this.getUrl({
      path: 'exportImage'
    });
  }
}
//# sourceMappingURL=arcgis-feature-service.js.map