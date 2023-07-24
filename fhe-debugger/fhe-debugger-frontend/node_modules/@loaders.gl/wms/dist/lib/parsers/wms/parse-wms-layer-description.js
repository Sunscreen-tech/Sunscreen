"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWMSLayerDescription = void 0;
const xml_1 = require("@loaders.gl/xml");
/**
 * Parses a typed data structure from raw XML for `GetFeatureInfo` response
 * @note Error handlings is fairly weak
 */
function parseWMSLayerDescription(text, options) {
    const parsedXML = xml_1.XMLLoader.parseTextSync?.(text, options);
    // TODO - implement parser
    return parsedXML;
}
exports.parseWMSLayerDescription = parseWMSLayerDescription;
