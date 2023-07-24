import { assert } from '@loaders.gl/loader-utils';
export function isLoaderObject(loader) {
  var _loader;
  if (!loader) {
    return false;
  }
  if (Array.isArray(loader)) {
    loader = loader[0];
  }
  const hasExtensions = Array.isArray((_loader = loader) === null || _loader === void 0 ? void 0 : _loader.extensions);
  return hasExtensions;
}
export function normalizeLoader(loader) {
  var _loader2, _loader3;
  assert(loader, 'null loader');
  assert(isLoaderObject(loader), 'invalid loader');
  let options;
  if (Array.isArray(loader)) {
    options = loader[1];
    loader = loader[0];
    loader = {
      ...loader,
      options: {
        ...loader.options,
        ...options
      }
    };
  }
  if ((_loader2 = loader) !== null && _loader2 !== void 0 && _loader2.parseTextSync || (_loader3 = loader) !== null && _loader3 !== void 0 && _loader3.parseText) {
    loader.text = true;
  }
  if (!loader.text) {
    loader.binary = true;
  }
  return loader;
}
//# sourceMappingURL=normalize-loader.js.map