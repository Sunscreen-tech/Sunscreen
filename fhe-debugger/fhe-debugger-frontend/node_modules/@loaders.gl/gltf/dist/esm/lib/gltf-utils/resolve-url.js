export function resolveUrl(url, options) {
  const absolute = url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:');
  if (absolute) {
    return url;
  }
  const baseUrl = options.baseUri || options.uri;
  if (!baseUrl) {
    throw new Error("'baseUri' must be provided to resolve relative url ".concat(url));
  }
  return baseUrl.substr(0, baseUrl.lastIndexOf('/') + 1) + url;
}
//# sourceMappingURL=resolve-url.js.map