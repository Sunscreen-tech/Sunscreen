"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArcGISFeatureService = void 0;
class ArcGISFeatureService {
    constructor(props) {
        this.url = props.url;
        this.loadOptions = props.loadOptions || {};
        this.fetch = props.fetch || fetch;
    }
    // URL creators
    metadataURL(options) {
        return this.getUrl({ ...options });
    }
    /**
     * Form a URL to an ESRI FeatureServer
  // https://services2.arcgis.com/CcI36Pduqd0OR4W9/ArcGIS/rest/services/Bicycle_Routes_Public/FeatureServer/0/query?
  //   returnGeometry=true&where=1%3D1&outSR=4326&outFields=*&inSR=4326&geometry=${-90}%2C+${30}%2C+${-70}%2C+${50}&
  //   geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&geometryPrecision=6&resultType=tile&f=geojson`
     */
    exportImageURL(options) {
        const { boundingBox } = options;
        // const bbox = `bbox=${boundingBox[0]},${boundingBox[1]},${boundingBox[2]},${boundingBox[3]}`;
        // const size = `size=${width},${height}`
        return this.getUrl({ path: 'exportImage', });
    }
}
exports.ArcGISFeatureService = ArcGISFeatureService;
