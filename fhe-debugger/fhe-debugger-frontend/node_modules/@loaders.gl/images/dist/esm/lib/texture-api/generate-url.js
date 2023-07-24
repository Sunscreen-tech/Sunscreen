import { resolvePath, assert } from '@loaders.gl/loader-utils';
export function generateUrl(getUrl, options, urlOptions) {
  let url = getUrl;
  if (typeof getUrl === 'function') {
    url = getUrl({
      ...options,
      ...urlOptions
    });
  }
  assert(typeof url === 'string');
  const {
    baseUrl
  } = options;
  if (baseUrl) {
    url = baseUrl[baseUrl.length - 1] === '/' ? "".concat(baseUrl).concat(url) : "".concat(baseUrl, "/").concat(url);
  }
  return resolvePath(url);
}
//# sourceMappingURL=generate-url.js.map