"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckWMSFeatureInfoLoader = exports.WMSFeatureInfoLoader = void 0;
const wms_capabilities_loader_1 = require("../wms-capabilities-loader");
const parse_wms_features_1 = require("../lib/parsers/wms/parse-wms-features");
/**
 * Loader for the response to the WMS GetFeatureInfo request
 */
exports.WMSFeatureInfoLoader = {
    ...wms_capabilities_loader_1.WMSCapabilitiesLoader,
    id: 'wms-feature-info',
    name: 'WMS FeatureInfo',
    parse: async (arrayBuffer, options) => (0, parse_wms_features_1.parseWMSFeatureInfo)(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync: (text, options) => (0, parse_wms_features_1.parseWMSFeatureInfo)(text, options)
};
exports._typecheckWMSFeatureInfoLoader = exports.WMSFeatureInfoLoader;
