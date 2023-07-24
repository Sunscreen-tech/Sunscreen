import { isResponse, isBlob } from '../../javascript-utils/is-type';
import { parseMIMEType, parseMIMETypeFromURL } from './mime-type-utils';
import { stripQueryString } from './url-utils';
export function getResourceUrl(resource) {
  if (isResponse(resource)) {
    const response = resource;
    return response.url;
  }
  if (isBlob(resource)) {
    const blob = resource;
    return blob.name || '';
  }
  if (typeof resource === 'string') {
    return resource;
  }
  return '';
}
export function getResourceMIMEType(resource) {
  if (isResponse(resource)) {
    const response = resource;
    const contentTypeHeader = response.headers.get('content-type') || '';
    const noQueryUrl = stripQueryString(response.url);
    return parseMIMEType(contentTypeHeader) || parseMIMETypeFromURL(noQueryUrl);
  }
  if (isBlob(resource)) {
    const blob = resource;
    return blob.type || '';
  }
  if (typeof resource === 'string') {
    return parseMIMETypeFromURL(resource);
  }
  return '';
}
export function getResourceContentLength(resource) {
  if (isResponse(resource)) {
    const response = resource;
    return response.headers['content-length'] || -1;
  }
  if (isBlob(resource)) {
    const blob = resource;
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