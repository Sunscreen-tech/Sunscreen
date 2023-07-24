"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWMSError = void 0;
const xml_1 = require("@loaders.gl/xml");
/**
 * Extract an error message from WMS error response XML
 * @param text
 * @param options
 * @returns a string with a human readable message
 */
function parseWMSError(text, options) {
    const parsedXML = xml_1.XMLLoader.parseTextSync?.(text, options);
    const serviceExceptionXML = parsedXML?.ServiceExceptionReport?.ServiceException ||
        parsedXML?.['ogc:ServiceExceptionReport']?.['ogc:ServiceException'];
    // Sigh, can be either a string or an object
    const message = typeof serviceExceptionXML === 'string'
        ? serviceExceptionXML
        : serviceExceptionXML.value || serviceExceptionXML.code || 'Unknown error';
    return message;
}
exports.parseWMSError = parseWMSError;
