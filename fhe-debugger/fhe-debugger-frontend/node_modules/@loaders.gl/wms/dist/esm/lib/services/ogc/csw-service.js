import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { DataSource } from '../../sources/data-source';
import { CSWCapabilitiesLoader } from '../../../csw-capabilities-loader';
import { CSWRecordsLoader } from '../../../csw-records-loader';
import { CSWDomainLoader } from '../../../csw-domain-loader';
import { WMSErrorLoader as CSWErrorLoader } from '../../../wms-error-loader';
export class CSWService extends DataSource {
  constructor(props) {
    super(props);
    _defineProperty(this, "capabilities", null);
    _defineProperty(this, "loaders", [CSWErrorLoader, CSWCapabilitiesLoader]);
  }
  async getMetadata() {
    const capabilities = await this.getCapabilities();
    return this.normalizeMetadata(capabilities);
  }
  normalizeMetadata(capabilities) {
    return capabilities;
  }
  async getServiceDirectory(options) {
    const services = [];
    const unknownServices = [];
    const records = await this.getRecords();
    for (const record of records.records) {
      for (const reference of record.references) {
        const url = reference.value;
        switch (reference.scheme) {
          case 'OGC:WMS':
            services.push({
              name: record.title,
              type: 'ogc-wms-service',
              ...this._parseOGCUrl(url)
            });
            break;
          case 'OGC:WMTS':
            services.push({
              name: record.title,
              type: 'ogc-wmts-service',
              ...this._parseOGCUrl(url)
            });
            break;
          case 'OGC:WFS':
            services.push({
              name: record.title,
              type: 'ogc-wfs-service',
              ...this._parseOGCUrl(url)
            });
            break;
          default:
            unknownServices.push({
              name: record.title,
              type: 'unknown',
              url: reference.value,
              scheme: reference.scheme
            });
        }
      }
    }
    return options !== null && options !== void 0 && options.includeUnknown ? services.concat(unknownServices) : services;
  }
  _parseOGCUrl(url) {
    const parts = url.split('?');
    return {
      url: parts[0],
      params: parts[1] || ''
    };
  }
  async getCapabilities(wmsParameters, vendorParameters) {
    const url = this.getCapabilitiesURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    const capabilities = await CSWCapabilitiesLoader.parse(arrayBuffer, this.props.loadOptions);
    return capabilities;
  }
  async getRecords(wmsParameters, vendorParameters) {
    const url = this.getRecordsURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    return await CSWRecordsLoader.parse(arrayBuffer, this.props.loadOptions);
  }
  async getDomain(wmsParameters, vendorParameters) {
    const url = this.getDomainURL(wmsParameters, vendorParameters);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this._checkResponse(response, arrayBuffer);
    return await CSWDomainLoader.parse(arrayBuffer, this.props.loadOptions);
  }
  getCapabilitiesURL(wmsParameters, vendorParameters) {
    const options = {
      version: '3.0.0',
      ...wmsParameters,
      ...vendorParameters,
      service: 'CSW',
      request: 'GetCapabilities'
    };
    return this._getCSWUrl(options, vendorParameters);
  }
  getRecordsURL(wmsParameters, vendorParameters) {
    const options = {
      version: '3.0.0',
      typenames: 'csw:Record',
      ...wmsParameters,
      ...vendorParameters,
      service: 'CSW',
      request: 'GetRecords'
    };
    return this._getCSWUrl(options, vendorParameters);
  }
  getDomainURL(wmsParameters, vendorParameters) {
    const options = {
      version: '3.0.0',
      ...wmsParameters,
      ...vendorParameters,
      service: 'CSW',
      request: 'GetDomain'
    };
    return this._getCSWUrl(options, vendorParameters);
  }
  _getCSWUrl(options, vendorParameters) {
    let url = this.props.url;
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
    return encodeURI(url);
  }
  _checkResponse(response, arrayBuffer) {
    const contentType = response.headers['content-type'];
    if (!response.ok || CSWErrorLoader.mimeTypes.includes(contentType)) {
      const error = CSWErrorLoader.parseSync(arrayBuffer, this.props.loadOptions);
      throw new Error(error);
    }
  }
  _parseError(arrayBuffer) {
    const error = CSWErrorLoader.parseSync(arrayBuffer, this.props.loadOptions);
    return new Error(error);
  }
}
_defineProperty(CSWService, "type", 'csw');
_defineProperty(CSWService, "testURL", url => url.toLowerCase().includes('csw'));
//# sourceMappingURL=csw-service.js.map