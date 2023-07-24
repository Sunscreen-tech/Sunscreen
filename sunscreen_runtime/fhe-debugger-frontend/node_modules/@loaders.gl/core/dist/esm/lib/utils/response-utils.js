import { isResponse } from '../../javascript-utils/is-type';
import { getResourceContentLength, getResourceUrl, getResourceMIMEType } from './resource-utils';
export async function makeResponse(resource) {
  if (isResponse(resource)) {
    return resource;
  }
  const headers = {};
  const contentLength = getResourceContentLength(resource);
  if (contentLength >= 0) {
    headers['content-length'] = String(contentLength);
  }
  const url = getResourceUrl(resource);
  const type = getResourceMIMEType(resource);
  if (type) {
    headers['content-type'] = type;
  }
  const initialDataUrl = await getInitialDataUrl(resource);
  if (initialDataUrl) {
    headers['x-first-bytes'] = initialDataUrl;
  }
  if (typeof resource === 'string') {
    resource = new TextEncoder().encode(resource);
  }
  const response = new Response(resource, {
    headers
  });
  Object.defineProperty(response, 'url', {
    value: url
  });
  return response;
}
export async function checkResponse(response) {
  if (!response.ok) {
    const message = await getResponseError(response);
    throw new Error(message);
  }
}
export function checkResponseSync(response) {
  if (!response.ok) {
    let message = "".concat(response.status, " ").concat(response.statusText);
    message = message.length > 60 ? "".concat(message.slice(0, 60), "...") : message;
    throw new Error(message);
  }
}
async function getResponseError(response) {
  let message = "Failed to fetch resource ".concat(response.url, " (").concat(response.status, "): ");
  try {
    const contentType = response.headers.get('Content-Type');
    let text = response.statusText;
    if (contentType.includes('application/json')) {
      text += " ".concat(await response.text());
    }
    message += text;
    message = message.length > 60 ? "".concat(message.slice(0, 60), "...") : message;
  } catch (error) {}
  return message;
}
async function getInitialDataUrl(resource) {
  const INITIAL_DATA_LENGTH = 5;
  if (typeof resource === 'string') {
    return "data:,".concat(resource.slice(0, INITIAL_DATA_LENGTH));
  }
  if (resource instanceof Blob) {
    const blobSlice = resource.slice(0, 5);
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = event => {
        var _event$target;
        return resolve(event === null || event === void 0 ? void 0 : (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result);
      };
      reader.readAsDataURL(blobSlice);
    });
  }
  if (resource instanceof ArrayBuffer) {
    const slice = resource.slice(0, INITIAL_DATA_LENGTH);
    const base64 = arrayBufferToBase64(slice);
    return "data:base64,".concat(base64);
  }
  return null;
}
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
//# sourceMappingURL=response-utils.js.map