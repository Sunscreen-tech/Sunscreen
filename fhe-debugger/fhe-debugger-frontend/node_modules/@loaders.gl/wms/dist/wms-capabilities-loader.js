"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckWMSCapabilitiesLoader = exports.WMSCapabilitiesLoader = void 0;
const parse_wms_capabilities_1 = require("./lib/parsers/wms/parse-wms-capabilities");
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for the response to the WMS GetCapability request
 */
exports.WMSCapabilitiesLoader = {
    id: 'wms-capabilities',
    name: 'WMS Capabilities',
    module: 'wms',
    version: VERSION,
    worker: false,
    extensions: ['xml'],
    mimeTypes: ['application/vnd.ogc.wms_xml', 'application/xml', 'text/xml'],
    testText: testXMLFile,
    options: {
        wms: {}
    },
    parse: async (arrayBuffer, options) => 
    // TODO pass in XML options
    (0, parse_wms_capabilities_1.parseWMSCapabilities)(new TextDecoder().decode(arrayBuffer), options?.wms),
    parseTextSync: (text, options) => 
    // TODO pass in XML options
    (0, parse_wms_capabilities_1.parseWMSCapabilities)(text, options?.wms)
};
function testXMLFile(text) {
    // TODO - There could be space first.
    return text.startsWith('<?xml');
}
exports._typecheckWMSCapabilitiesLoader = exports.WMSCapabilitiesLoader;
