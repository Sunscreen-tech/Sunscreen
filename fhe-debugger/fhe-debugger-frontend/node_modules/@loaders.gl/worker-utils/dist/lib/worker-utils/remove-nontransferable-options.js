"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNontransferableOptions = void 0;
/**
 * Recursively drop non serializable values like functions and regexps.
 * @param object
 */
function removeNontransferableOptions(object) {
    if (object === null) {
        return {};
    }
    const clone = Object.assign({}, object);
    Object.keys(clone).forEach((key) => {
        // Checking if it is an object and not a typed array.
        if (typeof object[key] === 'object' && !ArrayBuffer.isView(object[key])) {
            clone[key] = removeNontransferableOptions(object[key]);
        }
        else if (typeof clone[key] === 'function' || clone[key] instanceof RegExp) {
            clone[key] = {};
        }
        else {
            clone[key] = object[key];
        }
    });
    return clone;
}
exports.removeNontransferableOptions = removeNontransferableOptions;
