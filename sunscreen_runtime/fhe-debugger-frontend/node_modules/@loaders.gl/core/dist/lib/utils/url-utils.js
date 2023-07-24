"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripQueryString = exports.extractQueryString = void 0;
const QUERY_STRING_PATTERN = /\?.*/;
function extractQueryString(url) {
    const matches = url.match(QUERY_STRING_PATTERN);
    return matches && matches[0];
}
exports.extractQueryString = extractQueryString;
function stripQueryString(url) {
    return url.replace(QUERY_STRING_PATTERN, '');
}
exports.stripQueryString = stripQueryString;
