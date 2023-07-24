"use strict";
// TODO - these utilities could be moved to the XML parser.
// uncapitalizeKeys could be an XMLLoader option
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertXMLFieldToArrayInPlace = exports.convertXMLValueToArray = void 0;
/**
 * Extracts a value or array and always return an array
 * Useful since XML parses to object instead of array when only a single value is provided
 */
function convertXMLValueToArray(xmlValue) {
    if (Array.isArray(xmlValue)) {
        return xmlValue;
    }
    if (xmlValue && typeof xmlValue === 'object' && xmlValue['0']) {
        // Error this is an objectified array
    }
    if (xmlValue) {
        return [xmlValue];
    }
    return [];
}
exports.convertXMLValueToArray = convertXMLValueToArray;
/**
 * Mutates a field in place, converting it to array
 * Useful since XML parses to object instead of array when only a single value is provided
 */
function convertXMLFieldToArrayInPlace(xml, key) {
    xml[key] = convertXMLValueToArray(xml[key]);
}
exports.convertXMLFieldToArrayInPlace = convertXMLFieldToArrayInPlace;
