"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getXMLBoolean = exports.getXMLInteger = exports.getXMLFloat = exports.getXMLStringArray = exports.getXMLArray = void 0;
/** A single element of an array is not represented as an array in XML */
function getXMLArray(xmlValue) {
    // Already an array, return as is
    if (Array.isArray(xmlValue)) {
        return xmlValue;
    }
    // Single value, wrap in array
    if (xmlValue) {
        return [xmlValue];
    }
    // nullish, return empty array
    return [];
}
exports.getXMLArray = getXMLArray;
/** Get a list of strings from XML */
function getXMLStringArray(xmlValue) {
    const xmlArray = getXMLArray(xmlValue);
    if (xmlArray.length > 0 && xmlArray.every((_) => typeof _ === 'string')) {
        return xmlArray;
    }
    // TODO - error handling?
    return [];
}
exports.getXMLStringArray = getXMLStringArray;
/** Get XML float */
function getXMLFloat(xmlValue, defaultValue = undefined) {
    switch (typeof xmlValue) {
        case 'number':
            return xmlValue;
        case 'string':
            return parseFloat(xmlValue);
        default:
            return undefined;
    }
}
exports.getXMLFloat = getXMLFloat;
/** Get XML integer */
function getXMLInteger(xmlValue, defaultValue = undefined) {
    switch (typeof xmlValue) {
        case 'number':
            return xmlValue;
        case 'string':
            return parseInt(xmlValue, 10);
        default:
            return undefined;
    }
}
exports.getXMLInteger = getXMLInteger;
/** Somewhat arbitrary boolean parsing */
function getXMLBoolean(xmlValue) {
    switch (xmlValue) {
        case 'true':
            return true;
        case 'false':
            return false;
        case '1':
            return true;
        case '0':
            return false;
        default:
            return false;
    }
}
exports.getXMLBoolean = getXMLBoolean;
