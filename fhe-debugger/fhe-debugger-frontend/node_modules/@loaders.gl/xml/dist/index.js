"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._uncapitalizeKeys = exports._uncapitalize = exports.convertXMLFieldToArrayInPlace = exports.convertXMLValueToArray = exports.SAXParser = exports.HTMLLoader = exports.XMLLoader = void 0;
var xml_loader_1 = require("./xml-loader");
Object.defineProperty(exports, "XMLLoader", { enumerable: true, get: function () { return xml_loader_1.XMLLoader; } });
var html_loader_1 = require("./html-loader");
Object.defineProperty(exports, "HTMLLoader", { enumerable: true, get: function () { return html_loader_1.HTMLLoader; } });
var sax_1 = require("./sax-ts/sax");
Object.defineProperty(exports, "SAXParser", { enumerable: true, get: function () { return sax_1.SAXParser; } });
// Utilities
var xml_utils_1 = require("./lib/xml-utils/xml-utils");
Object.defineProperty(exports, "convertXMLValueToArray", { enumerable: true, get: function () { return xml_utils_1.convertXMLValueToArray; } });
Object.defineProperty(exports, "convertXMLFieldToArrayInPlace", { enumerable: true, get: function () { return xml_utils_1.convertXMLFieldToArrayInPlace; } });
// Experimental
var uncapitalize_1 = require("./lib/xml-utils/uncapitalize");
Object.defineProperty(exports, "_uncapitalize", { enumerable: true, get: function () { return uncapitalize_1.uncapitalize; } });
Object.defineProperty(exports, "_uncapitalizeKeys", { enumerable: true, get: function () { return uncapitalize_1.uncapitalizeKeys; } });
