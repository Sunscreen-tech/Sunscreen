"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addAliases = addAliases;
exports.getPathPrefix = getPathPrefix;
exports.resolvePath = resolvePath;
exports.setPathPrefix = setPathPrefix;
var pathPrefix = '';
var fileAliases = {};
function setPathPrefix(prefix) {
  pathPrefix = prefix;
}
function getPathPrefix() {
  return pathPrefix;
}
function addAliases(aliases) {
  Object.assign(fileAliases, aliases);
}
function resolvePath(filename) {
  for (var alias in fileAliases) {
    if (filename.startsWith(alias)) {
      var replacement = fileAliases[alias];
      filename = filename.replace(alias, replacement);
    }
  }
  if (!filename.startsWith('http://') && !filename.startsWith('https://')) {
    filename = "".concat(pathPrefix).concat(filename);
  }
  return filename;
}
//# sourceMappingURL=file-aliases.js.map