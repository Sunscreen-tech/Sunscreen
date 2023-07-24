import { compareArrayBuffers, path } from '@loaders.gl/loader-utils';
import { normalizeLoader } from '../loader-utils/normalize-loader';
import { log } from '../utils/log';
import { getResourceUrl, getResourceMIMEType } from '../utils/resource-utils';
import { getRegisteredLoaders } from './register-loaders';
import { isBlob } from '../../javascript-utils/is-type';
import { stripQueryString } from '../utils/url-utils';
const EXT_PATTERN = /\.([^.]+)$/;
export async function selectLoader(data) {
  let loaders = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let options = arguments.length > 2 ? arguments[2] : undefined;
  let context = arguments.length > 3 ? arguments[3] : undefined;
  if (!validHTTPResponse(data)) {
    return null;
  }
  let loader = selectLoaderSync(data, loaders, {
    ...options,
    nothrow: true
  }, context);
  if (loader) {
    return loader;
  }
  if (isBlob(data)) {
    data = await data.slice(0, 10).arrayBuffer();
    loader = selectLoaderSync(data, loaders, options, context);
  }
  if (!loader && !(options !== null && options !== void 0 && options.nothrow)) {
    throw new Error(getNoValidLoaderMessage(data));
  }
  return loader;
}
export function selectLoaderSync(data) {
  let loaders = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let options = arguments.length > 2 ? arguments[2] : undefined;
  let context = arguments.length > 3 ? arguments[3] : undefined;
  if (!validHTTPResponse(data)) {
    return null;
  }
  if (loaders && !Array.isArray(loaders)) {
    return normalizeLoader(loaders);
  }
  let candidateLoaders = [];
  if (loaders) {
    candidateLoaders = candidateLoaders.concat(loaders);
  }
  if (!(options !== null && options !== void 0 && options.ignoreRegisteredLoaders)) {
    candidateLoaders.push(...getRegisteredLoaders());
  }
  normalizeLoaders(candidateLoaders);
  const loader = selectLoaderInternal(data, candidateLoaders, options, context);
  if (!loader && !(options !== null && options !== void 0 && options.nothrow)) {
    throw new Error(getNoValidLoaderMessage(data));
  }
  return loader;
}
function selectLoaderInternal(data, loaders, options, context) {
  const url = getResourceUrl(data);
  const type = getResourceMIMEType(data);
  const testUrl = stripQueryString(url) || (context === null || context === void 0 ? void 0 : context.url);
  let loader = null;
  let reason = '';
  if (options !== null && options !== void 0 && options.mimeType) {
    loader = findLoaderByMIMEType(loaders, options === null || options === void 0 ? void 0 : options.mimeType);
    reason = "match forced by supplied MIME type ".concat(options === null || options === void 0 ? void 0 : options.mimeType);
  }
  loader = loader || findLoaderByUrl(loaders, testUrl);
  reason = reason || (loader ? "matched url ".concat(testUrl) : '');
  loader = loader || findLoaderByMIMEType(loaders, type);
  reason = reason || (loader ? "matched MIME type ".concat(type) : '');
  loader = loader || findLoaderByInitialBytes(loaders, data);
  reason = reason || (loader ? "matched initial data ".concat(getFirstCharacters(data)) : '');
  loader = loader || findLoaderByMIMEType(loaders, options === null || options === void 0 ? void 0 : options.fallbackMimeType);
  reason = reason || (loader ? "matched fallback MIME type ".concat(type) : '');
  if (reason) {
    var _loader;
    log.log(1, "selectLoader selected ".concat((_loader = loader) === null || _loader === void 0 ? void 0 : _loader.name, ": ").concat(reason, "."));
  }
  return loader;
}
function validHTTPResponse(data) {
  if (data instanceof Response) {
    if (data.status === 204) {
      return false;
    }
  }
  return true;
}
function getNoValidLoaderMessage(data) {
  const url = getResourceUrl(data);
  const type = getResourceMIMEType(data);
  let message = 'No valid loader found (';
  message += url ? "".concat(path.filename(url), ", ") : 'no url provided, ';
  message += "MIME type: ".concat(type ? "\"".concat(type, "\"") : 'not provided', ", ");
  const firstCharacters = data ? getFirstCharacters(data) : '';
  message += firstCharacters ? " first bytes: \"".concat(firstCharacters, "\"") : 'first bytes: not available';
  message += ')';
  return message;
}
function normalizeLoaders(loaders) {
  for (const loader of loaders) {
    normalizeLoader(loader);
  }
}
function findLoaderByUrl(loaders, url) {
  const match = url && EXT_PATTERN.exec(url);
  const extension = match && match[1];
  return extension ? findLoaderByExtension(loaders, extension) : null;
}
function findLoaderByExtension(loaders, extension) {
  extension = extension.toLowerCase();
  for (const loader of loaders) {
    for (const loaderExtension of loader.extensions) {
      if (loaderExtension.toLowerCase() === extension) {
        return loader;
      }
    }
  }
  return null;
}
function findLoaderByMIMEType(loaders, mimeType) {
  for (const loader of loaders) {
    if (loader.mimeTypes && loader.mimeTypes.includes(mimeType)) {
      return loader;
    }
    if (mimeType === "application/x.".concat(loader.id)) {
      return loader;
    }
  }
  return null;
}
function findLoaderByInitialBytes(loaders, data) {
  if (!data) {
    return null;
  }
  for (const loader of loaders) {
    if (typeof data === 'string') {
      if (testDataAgainstText(data, loader)) {
        return loader;
      }
    } else if (ArrayBuffer.isView(data)) {
      if (testDataAgainstBinary(data.buffer, data.byteOffset, loader)) {
        return loader;
      }
    } else if (data instanceof ArrayBuffer) {
      const byteOffset = 0;
      if (testDataAgainstBinary(data, byteOffset, loader)) {
        return loader;
      }
    }
  }
  return null;
}
function testDataAgainstText(data, loader) {
  if (loader.testText) {
    return loader.testText(data);
  }
  const tests = Array.isArray(loader.tests) ? loader.tests : [loader.tests];
  return tests.some(test => data.startsWith(test));
}
function testDataAgainstBinary(data, byteOffset, loader) {
  const tests = Array.isArray(loader.tests) ? loader.tests : [loader.tests];
  return tests.some(test => testBinary(data, byteOffset, loader, test));
}
function testBinary(data, byteOffset, loader, test) {
  if (test instanceof ArrayBuffer) {
    return compareArrayBuffers(test, data, test.byteLength);
  }
  switch (typeof test) {
    case 'function':
      return test(data, loader);
    case 'string':
      const magic = getMagicString(data, byteOffset, test.length);
      return test === magic;
    default:
      return false;
  }
}
function getFirstCharacters(data) {
  let length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5;
  if (typeof data === 'string') {
    return data.slice(0, length);
  } else if (ArrayBuffer.isView(data)) {
    return getMagicString(data.buffer, data.byteOffset, length);
  } else if (data instanceof ArrayBuffer) {
    const byteOffset = 0;
    return getMagicString(data, byteOffset, length);
  }
  return '';
}
function getMagicString(arrayBuffer, byteOffset, length) {
  if (arrayBuffer.byteLength < byteOffset + length) {
    return '';
  }
  const dataView = new DataView(arrayBuffer);
  let magic = '';
  for (let i = 0; i < length; i++) {
    magic += String.fromCharCode(dataView.getUint8(byteOffset + i));
  }
  return magic;
}
//# sourceMappingURL=select-loader.js.map