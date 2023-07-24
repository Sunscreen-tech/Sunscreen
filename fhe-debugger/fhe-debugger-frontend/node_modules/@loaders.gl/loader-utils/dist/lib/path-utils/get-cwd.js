"use strict";
// loaders.gl MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCWD = void 0;
function getCWD() {
    if (typeof process !== 'undefined' && typeof process.cwd !== 'undefined') {
        return process.cwd();
    }
    const pathname = window.location?.pathname;
    return pathname?.slice(0, pathname.lastIndexOf('/') + 1) || '';
}
exports.getCWD = getCWD;
