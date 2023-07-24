let pathPrefix = '';
const fileAliases = {};
export function setPathPrefix(prefix) {
  pathPrefix = prefix;
}
export function getPathPrefix() {
  return pathPrefix;
}
export function addAliases(aliases) {
  Object.assign(fileAliases, aliases);
}
export function resolvePath(filename) {
  for (const alias in fileAliases) {
    if (filename.startsWith(alias)) {
      const replacement = fileAliases[alias];
      filename = filename.replace(alias, replacement);
    }
  }
  if (!filename.startsWith('http://') && !filename.startsWith('https://')) {
    filename = "".concat(pathPrefix).concat(filename);
  }
  return filename;
}
//# sourceMappingURL=file-aliases.js.map