"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getResourceContentLength = getResourceContentLength;
exports.getResourceMIMEType = getResourceMIMEType;
exports.getResourceUrl = getResourceUrl;
var _isType = require("../../javascript-utils/is-type");
var _mimeTypeUtils = require("./mime-type-utils");
var _urlUtils = require("./url-utils");
function getResourceUrl(resource) {
  if ((0, _isType.isResponse)(resource)) {
    var response = resource;
    return response.url;
  }
  if ((0, _isType.isBlob)(resource)) {
    var blob = resource;
    return blob.name || '';
  }
  if (typeof resource === 'string') {
    return resource;
  }
  return '';
}
function getResourceMIMEType(resource) {
  if ((0, _isType.isResponse)(resource)) {
    var response = resource;
    var contentTypeHeader = response.headers.get('content-type') || '';
    var noQueryUrl = (0, _urlUtils.stripQueryString)(response.url);
    return (0, _mimeTypeUtils.parseMIMEType)(contentTypeHeader) || (0, _mimeTypeUtils.parseMIMETypeFromURL)(noQueryUrl);
  }
  if ((0, _isType.isBlob)(resource)) {
    var blob = resource;
    return blob.type || '';
  }
  if (typeof resource === 'string') {
    return (0, _mimeTypeUtils.parseMIMETypeFromURL)(resource);
  }
  return '';
}
function getResourceContentLength(resource) {
  if ((0, _isType.isResponse)(resource)) {
    var response = resource;
    return response.headers['content-length'] || -1;
  }
  if ((0, _isType.isBlob)(resource)) {
    var blob = resource;
    return blob.size;
  }
  if (typeof resource === 'string') {
    return resource.length;
  }
  if (resource instanceof ArrayBuffer) {
    return resource.byteLength;
  }
  if (ArrayBuffer.isView(resource)) {
    return resource.byteLength;
  }
  return -1;
}
//# sourceMappingURL=resource-utils.js.map