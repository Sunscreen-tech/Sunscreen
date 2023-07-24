"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckWFSCapabilitiesLoader = exports.WFSCapabilitiesLoader = void 0;
const parse_wfs_capabilities_1 = require("./lib/wfs/parse-wfs-capabilities");
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for the response to the WFS GetCapability request
 */
exports.WFSCapabilitiesLoader = {
    id: 'wfs-capabilities',
    name: 'WFS Capabilities',
    module: 'wms',
    version: VERSION,
    worker: false,
    extensions: ['xml'],
    mimeTypes: ['application/vnd.ogc.wfs_xml', 'application/xml', 'text/xml'],
    testText: testXMLFile,
    options: {
        wms: {}
    },
    parse: async (arrayBuffer, options) => (0, parse_wfs_capabilities_1.parseWFSCapabilities)(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync: (text, options) => (0, parse_wfs_capabilities_1.parseWFSCapabilities)(text, options)
};
function testXMLFile(text) {
    // TODO - There could be space first.
    return text.startsWith('<?xml');
}
exports._typecheckWFSCapabilitiesLoader = exports.WFSCapabilitiesLoader;
