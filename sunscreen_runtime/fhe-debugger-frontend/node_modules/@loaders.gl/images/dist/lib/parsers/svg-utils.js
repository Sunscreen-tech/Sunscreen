"use strict";
// SVG parsing has limitations, e.g:
// https://bugs.chromium.org/p/chromium/issues/detail?id=606319
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlob = exports.getBlobOrSVGDataUrl = exports.isSVG = void 0;
const SVG_DATA_URL_PATTERN = /^data:image\/svg\+xml/;
const SVG_URL_PATTERN = /\.svg((\?|#).*)?$/;
function isSVG(url) {
    return url && (SVG_DATA_URL_PATTERN.test(url) || SVG_URL_PATTERN.test(url));
}
exports.isSVG = isSVG;
function getBlobOrSVGDataUrl(arrayBuffer, url) {
    if (isSVG(url)) {
        // Prepare a properly tagged data URL, and load using normal mechanism
        const textDecoder = new TextDecoder();
        let xmlText = textDecoder.decode(arrayBuffer);
        // TODO Escape in browser to support e.g. Chinese characters
        try {
            if (typeof unescape === 'function' && typeof encodeURIComponent === 'function') {
                xmlText = unescape(encodeURIComponent(xmlText));
            }
        }
        catch (error) {
            throw new Error(error.message);
        }
        // base64 encoding is safer. utf-8 fails in some browsers
        const src = `data:image/svg+xml;base64,${btoa(xmlText)}`;
        return src;
    }
    return getBlob(arrayBuffer, url);
}
exports.getBlobOrSVGDataUrl = getBlobOrSVGDataUrl;
function getBlob(arrayBuffer, url) {
    if (isSVG(url)) {
        // https://bugs.chromium.org/p/chromium/issues/detail?id=606319
        // return new Blob([new Uint8Array(arrayBuffer)], {type: 'image/svg+xml'});
        throw new Error('SVG cannot be parsed directly to imagebitmap');
    }
    // TODO - how to determine mime type? Param? Sniff here?
    return new Blob([new Uint8Array(arrayBuffer)]); // MIME type not needed?
}
exports.getBlob = getBlob;
