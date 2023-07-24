"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUrl = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
// Generate a url by calling getUrl with mix of options, applying options.baseUrl
function generateUrl(getUrl, options, urlOptions) {
    // Get url
    let url = getUrl;
    if (typeof getUrl === 'function') {
        url = getUrl({ ...options, ...urlOptions });
    }
    (0, loader_utils_1.assert)(typeof url === 'string');
    // Apply options.baseUrl
    const { baseUrl } = options;
    if (baseUrl) {
        url = baseUrl[baseUrl.length - 1] === '/' ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    }
    return (0, loader_utils_1.resolvePath)(url);
}
exports.generateUrl = generateUrl;
