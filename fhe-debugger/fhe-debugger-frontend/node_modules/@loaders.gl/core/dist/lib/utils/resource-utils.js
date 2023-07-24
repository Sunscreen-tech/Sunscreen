"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceContentLength = exports.getResourceMIMEType = exports.getResourceUrl = void 0;
const is_type_1 = require("../../javascript-utils/is-type");
const mime_type_utils_1 = require("./mime-type-utils");
const url_utils_1 = require("./url-utils");
/**
 * Returns the URL associated with this resource.
 * The returned value may include a query string and need further processing.
 * If it cannot determine url, the corresponding value will be an empty string
 *
 * @todo string parameters are assumed to be URLs
 */
function getResourceUrl(resource) {
    // If resource is a `Response`, it contains the information directly as a field
    if ((0, is_type_1.isResponse)(resource)) {
        const response = resource;
        return response.url;
    }
    // If the resource is a Blob or a File (subclass of Blob)
    if ((0, is_type_1.isBlob)(resource)) {
        const blob = resource;
        // File objects have a "name" property. Blob objects don't have any
        // url (name) information
        return blob.name || '';
    }
    if (typeof resource === 'string') {
        return resource;
    }
    // Unknown
    return '';
}
exports.getResourceUrl = getResourceUrl;
/**
 * Returns the URL associated with this resource.
 * The returned value may include a query string and need further processing.
 * If it cannot determine url, the corresponding value will be an empty string
 *
 * @todo string parameters are assumed to be URLs
 */
function getResourceMIMEType(resource) {
    // If resource is a response, it contains the information directly
    if ((0, is_type_1.isResponse)(resource)) {
        const response = resource;
        const contentTypeHeader = response.headers.get('content-type') || '';
        const noQueryUrl = (0, url_utils_1.stripQueryString)(response.url);
        return (0, mime_type_utils_1.parseMIMEType)(contentTypeHeader) || (0, mime_type_utils_1.parseMIMETypeFromURL)(noQueryUrl);
    }
    // If the resource is a Blob or a File (subclass of Blob)
    if ((0, is_type_1.isBlob)(resource)) {
        const blob = resource;
        return blob.type || '';
    }
    if (typeof resource === 'string') {
        return (0, mime_type_utils_1.parseMIMETypeFromURL)(resource);
    }
    // Unknown
    return '';
}
exports.getResourceMIMEType = getResourceMIMEType;
/**
  * Returns (approximate) content length for a resource if it can be determined.
  * Returns -1 if content length cannot be determined.
  * @param resource

  * @note string parameters are NOT assumed to be URLs
  */
function getResourceContentLength(resource) {
    if ((0, is_type_1.isResponse)(resource)) {
        const response = resource;
        return response.headers['content-length'] || -1;
    }
    if ((0, is_type_1.isBlob)(resource)) {
        const blob = resource;
        return blob.size;
    }
    if (typeof resource === 'string') {
        // TODO - handle data URL?
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
exports.getResourceContentLength = getResourceContentLength;
