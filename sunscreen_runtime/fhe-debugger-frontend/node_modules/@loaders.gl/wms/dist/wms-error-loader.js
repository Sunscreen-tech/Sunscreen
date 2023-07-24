"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckWMSErrorLoader = exports.WMSErrorLoader = void 0;
const parse_wms_error_1 = require("./lib/parsers/wms/parse-wms-error");
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for the response to the WMS GetCapability request
 */
exports.WMSErrorLoader = {
    id: 'wms-error',
    name: 'WMS Error',
    module: 'wms',
    version: VERSION,
    worker: false,
    extensions: ['xml'],
    mimeTypes: ['application/vnd.ogc.se_xml', 'application/xml', 'text/xml'],
    testText: testXMLFile,
    options: {
        wms: {
            throwOnError: false
        }
    },
    parse: async (arrayBuffer, options) => parseTextSync(new TextDecoder().decode(arrayBuffer), options),
    parseSync: (arrayBuffer, options) => parseTextSync(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync: (text, options) => parseTextSync(text, options)
};
function testXMLFile(text) {
    // TODO - There could be space first.
    return text.startsWith('<?xml');
}
function parseTextSync(text, options) {
    const wmsOptions = { ...exports.WMSErrorLoader.options.wms, ...options?.wms };
    const error = (0, parse_wms_error_1.parseWMSError)(text, wmsOptions);
    const message = wmsOptions.minimalErrors ? error : `WMS Service error: ${error}`;
    if (wmsOptions.throwOnError) {
        throw new Error(message);
    }
    return message;
}
exports._typecheckWMSErrorLoader = exports.WMSErrorLoader;
