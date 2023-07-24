"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToArrayRow = exports.convertToObjectRow = void 0;
/** Convert an object row to an array row */
function convertToObjectRow(arrayRow, headers) {
    if (!arrayRow) {
        throw new Error('null row');
    }
    if (!headers) {
        throw new Error('no headers');
    }
    const objectRow = {};
    for (let i = 0; i < headers.length; i++) {
        objectRow[headers[i]] = arrayRow[i];
    }
    return objectRow;
}
exports.convertToObjectRow = convertToObjectRow;
/** Convert an object row to an array row */
function convertToArrayRow(objectRow, headers) {
    if (!objectRow) {
        throw new Error('null row');
    }
    if (!headers) {
        throw new Error('no headers');
    }
    const arrayRow = new Array(headers.length);
    for (let i = 0; i < headers.length; i++) {
        arrayRow[i] = objectRow[headers[i]];
    }
    return arrayRow;
}
exports.convertToArrayRow = convertToArrayRow;
