const DATA_URL_PATTERN = /^data:([-\w.]+\/[-\w.+]+)(;|,)/;
const MIME_TYPE_PATTERN = /^([-\w.]+\/[-\w.+]+)/;
export function parseMIMEType(mimeString) {
  const matches = MIME_TYPE_PATTERN.exec(mimeString);
  if (matches) {
    return matches[1];
  }
  return mimeString;
}
export function parseMIMETypeFromURL(url) {
  const matches = DATA_URL_PATTERN.exec(url);
  if (matches) {
    return matches[1];
  }
  return '';
}
//# sourceMappingURL=mime-type-utils.js.map