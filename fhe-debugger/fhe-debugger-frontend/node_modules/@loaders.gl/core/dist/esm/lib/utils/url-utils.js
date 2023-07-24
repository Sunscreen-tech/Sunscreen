const QUERY_STRING_PATTERN = /\?.*/;
export function extractQueryString(url) {
  const matches = url.match(QUERY_STRING_PATTERN);
  return matches && matches[0];
}
export function stripQueryString(url) {
  return url.replace(QUERY_STRING_PATTERN, '');
}
//# sourceMappingURL=url-utils.js.map