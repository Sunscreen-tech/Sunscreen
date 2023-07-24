import { resolvePath } from '@loaders.gl/loader-utils';
export function generateUrl(getUrl, options, urlOptions) {
  let url = typeof getUrl === 'function' ? getUrl({
    ...options,
    ...urlOptions
  }) : getUrl;
  const baseUrl = options.baseUrl;
  if (baseUrl) {
    url = baseUrl[baseUrl.length - 1] === '/' ? "".concat(baseUrl).concat(url) : "".concat(baseUrl, "/").concat(url);
  }
  return resolvePath(url);
}
//# sourceMappingURL=generate-url.js.map