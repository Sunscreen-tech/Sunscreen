import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { ImageLoader } from '@loaders.gl/images';
import { mergeLoaderOptions } from '@loaders.gl/loader-utils';
import { ImageSource } from '../../sources/image-source';
import { WMSCapabilitiesLoader } from '../../../wms-capabilities-loader';
import { WMSFeatureInfoLoader } from '../../../wip/wms-feature-info-loader';
import { WMSLayerDescriptionLoader } from '../../../wip/wms-layer-description-loader';
import { WMSErrorLoader } from '../../../wms-error-loader';
export class WMSService extends ImageSource {
  constructor(props) {
    var _props$substituteCRS;
    super(props);
    _defineProperty(this, "url", void 0);
    _defineProperty(this, "substituteCRS84", void 0);
    _defineProperty(this, "flipCRS", void 0);
    _defineProperty(this, "wmsParameters", void 0);
    _defineProperty(this, "vendorParameters", void 0);
    _defineProperty(this, "capabilities", null);
    _defineProperty(this, "loaders", [ImageLoader, WMSErrorLoader, WMSCapabilitiesLoader, WMSFeatureInfoLoader, WMSLayerDescriptionLoader]);
    this.url = props.url;
    this.substituteCRS84 = (_props$substituteCRS = props.substituteCRS84) !== null && _props$substituteCRS !== void 0 ? _props$substituteCRS : false;
    this.flipCRS = ['EPSG:4326'];
    this.wmsParameters = {
      layers: undefined,
      query_layers: undefined,
      styles: undefined,
      version: '1.3.0',
      crs: 'EPSG:4326',
      format: 'image/png',
      info_format: 'text/plain',
      transparent: undefined,
      time: undefined,
      elevation: undefined,
      ...props.wmsParameters
    };
    this.vendorParameters = props.vendorParameters || {};
  }
  async getMetadata() {
    const capabilities = await this.getCapabilities();
    return this.normalizeMetadata(capabilities);
  }
  async getImage(parameters) {
    return await this.getMap(parameters);
  }
  normalizeMetadata(capabilities) {
    return capabilities;
  }
  async getCapabilities(wmsParameters, vendorParameters) {
    const url = this.getCapabilitiesURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    const capabilities = await WMSCapabilitiesLoader.parse(arrayBuffer, this.loadOptions);
    this.capabilities = capabilities;
    return capabilities;
  }
  async getMap(wmsParameters, vendorParameters) {
    const url = this.getMapURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    try {
      return await ImageLoader.parse(arrayBuffer, this.loadOptions);
    } catch {
      throw this._parseError(arrayBuffer);
    }
  }
  async getFeatureInfo(wmsParameters, vendorParameters) {
    const url = this.getFeatureInfoURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    return await WMSFeatureInfoLoader.parse(arrayBuffer, this.loadOptions);
  }
  async getFeatureInfoText(wmsParameters, vendorParameters) {
    const url = this.getFeatureInfoURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    return new TextDecoder().decode(arrayBuffer);
  }
  async describeLayer(wmsParameters, vendorParameters) {
    const url = this.describeLayerURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    return await WMSLayerDescriptionLoader.parse(arrayBuffer, this.loadOptions);
  }
  async getLegendGraphic(wmsParameters, vendorParameters) {
    const url = this.getLegendGraphicURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    try {
      return await ImageLoader.parse(arrayBuffer, this.loadOptions);
    } catch {
      throw this._parseError(arrayBuffer);
    }
  }
  getCapabilitiesURL(wmsParameters, vendorParameters) {
    const options = {
      version: this.wmsParameters.version,
      ...wmsParameters
    };
    return this._getWMSUrl('GetCapabilities', options, vendorParameters);
  }
  getMapURL(wmsParameters, vendorParameters) {
    wmsParameters = this._getWMS130Parameters(wmsParameters);
    const options = {
      version: this.wmsParameters.version,
      format: this.wmsParameters.format,
      transparent: this.wmsParameters.transparent,
      time: this.wmsParameters.time,
      elevation: this.wmsParameters.elevation,
      layers: this.wmsParameters.layers,
      styles: this.wmsParameters.styles,
      crs: this.wmsParameters.crs,
      ...wmsParameters
    };
    return this._getWMSUrl('GetMap', options, vendorParameters);
  }
  getFeatureInfoURL(wmsParameters, vendorParameters) {
    const options = {
      version: this.wmsParameters.version,
      info_format: this.wmsParameters.info_format,
      layers: this.wmsParameters.layers,
      query_layers: this.wmsParameters.query_layers,
      styles: this.wmsParameters.styles,
      crs: this.wmsParameters.crs,
      ...wmsParameters
    };
    return this._getWMSUrl('GetFeatureInfo', options, vendorParameters);
  }
  describeLayerURL(wmsParameters, vendorParameters) {
    const options = {
      version: this.wmsParameters.version,
      ...wmsParameters
    };
    return this._getWMSUrl('DescribeLayer', options, vendorParameters);
  }
  getLegendGraphicURL(wmsParameters, vendorParameters) {
    const options = {
      version: this.wmsParameters.version,
      ...wmsParameters
    };
    return this._getWMSUrl('GetLegendGraphic', options, vendorParameters);
  }
  _parseWMSUrl(url) {
    const [baseUrl, search] = url.split('?');
    const searchParams = search.split('&');
    const parameters = {};
    for (const parameter of searchParams) {
      const [key, value] = parameter.split('=');
      parameters[key] = value;
    }
    return {
      url: baseUrl,
      parameters
    };
  }
  _getWMSUrl(request, wmsParameters, vendorParameters) {
    let url = this.url;
    let first = true;
    const allParameters = {
      service: 'WMS',
      version: wmsParameters.version,
      request,
      ...wmsParameters,
      ...this.vendorParameters,
      ...vendorParameters
    };
    const IGNORE_EMPTY_KEYS = ['transparent', 'time', 'elevation'];
    for (const [key, value] of Object.entries(allParameters)) {
      if (!IGNORE_EMPTY_KEYS.includes(key) || value) {
        url += first ? '?' : '&';
        first = false;
        url += this._getURLParameter(key, value, wmsParameters);
      }
    }
    return encodeURI(url);
  }
  _getWMS130Parameters(wmsParameters) {
    const newParameters = {
      ...wmsParameters
    };
    if (newParameters.srs) {
      newParameters.crs = newParameters.crs || newParameters.srs;
      delete newParameters.srs;
    }
    return newParameters;
  }
  _getURLParameter(key, value, wmsParameters) {
    switch (key) {
      case 'crs':
        if (wmsParameters.version !== '1.3.0') {
          key = 'srs';
        } else if (this.substituteCRS84 && value === 'EPSG:4326') {
          value = 'CRS:84';
        }
        break;
      case 'srs':
        if (wmsParameters.version === '1.3.0') {
          key = 'crs';
        }
        break;
      case 'bbox':
        const bbox = this._flipBoundingBox(value, wmsParameters);
        if (bbox) {
          value = bbox;
        }
        break;
      default:
    }
    key = key.toUpperCase();
    return Array.isArray(value) ? "".concat(key, "=").concat(value.join(',')) : "".concat(key, "=").concat(value ? String(value) : '');
  }
  _flipBoundingBox(bboxValue, wmsParameters) {
    if (!Array.isArray(bboxValue) || bboxValue.length !== 4) {
      return null;
    }
    const flipCoordinates = wmsParameters.version === '1.3.0' && this.flipCRS.includes(wmsParameters.crs || '') && !(this.substituteCRS84 && wmsParameters.crs === 'EPSG:4326');
    const bbox = bboxValue;
    return flipCoordinates ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox;
  }
  async _fetchArrayBuffer(url) {
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    return arrayBuffer;
  }
  _checkResponse(response, arrayBuffer) {
    const contentType = response.headers['content-type'];
    if (!response.ok || WMSErrorLoader.mimeTypes.includes(contentType)) {
      const loadOptions = mergeLoaderOptions(this.loadOptions, {
        wms: {
          throwOnError: true
        }
      });
      const error = WMSErrorLoader.parseSync(arrayBuffer, loadOptions);
      throw new Error(error);
    }
  }
  _parseError(arrayBuffer) {
    const error = WMSErrorLoader.parseSync(arrayBuffer, this.loadOptions);
    return new Error(error);
  }
}
_defineProperty(WMSService, "type", 'wms');
_defineProperty(WMSService, "testURL", url => url.toLowerCase().includes('wms'));
//# sourceMappingURL=wms-service.js.map