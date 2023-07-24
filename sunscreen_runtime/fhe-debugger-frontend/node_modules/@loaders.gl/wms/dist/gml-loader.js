"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckGMLLoader = exports.GMLLoader = void 0;
const parse_gml_1 = require("./lib/parsers/gml/parse-gml");
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for the response to the GML GetCapability request
 */
exports.GMLLoader = {
    name: 'GML',
    id: 'gml',
    module: 'wms',
    version: VERSION,
    worker: false,
    extensions: ['xml'],
    mimeTypes: ['application/vnd.ogc.gml', 'application/xml', 'text/xml'],
    testText: testXMLFile,
    options: {
        gml: {}
    },
    parse: async (arrayBuffer, options) => (0, parse_gml_1.parseGML)(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync: (text, options) => (0, parse_gml_1.parseGML)(text, options)
};
function testXMLFile(text) {
    // TODO - There could be space first.
    return text.startsWith('<?xml');
}
exports._typecheckGMLLoader = exports.GMLLoader;
