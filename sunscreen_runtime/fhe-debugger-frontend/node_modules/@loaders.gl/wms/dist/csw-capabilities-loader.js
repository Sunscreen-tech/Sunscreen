"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckCSWCapabilitiesLoader = exports.CSWCapabilitiesLoader = void 0;
const parse_csw_capabilities_1 = require("./lib/parsers/csw/parse-csw-capabilities");
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for the response to the CSW GetCapability request
 */
exports.CSWCapabilitiesLoader = {
    id: 'csw-capabilities',
    name: 'CSW Capabilities',
    module: 'wms',
    version: VERSION,
    worker: false,
    extensions: ['xml'],
    mimeTypes: ['application/vnd.ogc.csw_xml', 'application/xml', 'text/xml'],
    testText: testXMLFile,
    options: {
        csw: {}
    },
    parse: async (arrayBuffer, options) => (0, parse_csw_capabilities_1.parseCSWCapabilities)(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync: (text, options) => (0, parse_csw_capabilities_1.parseCSWCapabilities)(text, options)
};
function testXMLFile(text) {
    // TODO - There could be space first.
    return text.startsWith('<?xml');
}
exports._typecheckCSWCapabilitiesLoader = exports.CSWCapabilitiesLoader;
