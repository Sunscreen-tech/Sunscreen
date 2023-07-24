"use strict";
// Simple file alias mechanisms for tests.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePath = exports.addAliases = exports.getPathPrefix = exports.setPathPrefix = void 0;
let pathPrefix = '';
const fileAliases = {};
/*
 * Set a relative path prefix
 */
function setPathPrefix(prefix) {
    pathPrefix = prefix;
}
exports.setPathPrefix = setPathPrefix;
/*
 * Get the relative path prefix
 */
function getPathPrefix() {
    return pathPrefix;
}
exports.getPathPrefix = getPathPrefix;
/**
 *
 * @param aliases
 *
 * Note: addAliases are an experimental export, they are only for testing of loaders.gl loaders
 * not intended as a generic aliasing mechanism
 */
function addAliases(aliases) {
    Object.assign(fileAliases, aliases);
}
exports.addAliases = addAliases;
/**
 * Resolves aliases and adds path-prefix to paths
 */
function resolvePath(filename) {
    for (const alias in fileAliases) {
        if (filename.startsWith(alias)) {
            const replacement = fileAliases[alias];
            filename = filename.replace(alias, replacement);
        }
    }
    if (!filename.startsWith('http://') && !filename.startsWith('https://')) {
        filename = `${pathPrefix}${filename}`;
    }
    return filename;
}
exports.resolvePath = resolvePath;
