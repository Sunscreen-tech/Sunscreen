"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.uncapitalizeKeys = exports.uncapitalize = void 0;
/**
 * Uncapitalize first letter of a string
 * @param str
 * @returns
 */
function uncapitalize(str) {
    return typeof str === 'string' ? str.charAt(0).toLowerCase() + str.slice(1) : str;
}
exports.uncapitalize = uncapitalize;
/**
 * Recursively uncapitalize all keys in a nested object
 * @param object
 * @returns
 */
function uncapitalizeKeys(object) {
    if (Array.isArray(object)) {
        return object.map((element) => uncapitalizeKeys(element));
    }
    if (object && typeof object === 'object') {
        const newObject = {};
        for (const [key, value] of Object.entries(object)) {
            newObject[uncapitalize(key)] = uncapitalizeKeys(value);
        }
        return newObject;
    }
    return object;
}
exports.uncapitalizeKeys = uncapitalizeKeys;
