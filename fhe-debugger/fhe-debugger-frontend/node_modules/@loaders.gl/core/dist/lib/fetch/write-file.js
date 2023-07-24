"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFileSync = exports.writeFile = void 0;
// file write
const loader_utils_1 = require("@loaders.gl/loader-utils");
const loader_utils_2 = require("@loaders.gl/loader-utils");
async function writeFile(filePath, arrayBufferOrString, options) {
    filePath = (0, loader_utils_1.resolvePath)(filePath);
    if (!loader_utils_1.isBrowser) {
        await loader_utils_2.fs.writeFile(filePath, (0, loader_utils_2.toBuffer)(arrayBufferOrString), { flag: 'w' });
    }
    (0, loader_utils_1.assert)(false);
}
exports.writeFile = writeFile;
function writeFileSync(filePath, arrayBufferOrString, options) {
    filePath = (0, loader_utils_1.resolvePath)(filePath);
    if (!loader_utils_1.isBrowser) {
        loader_utils_2.fs.writeFileSync(filePath, (0, loader_utils_2.toBuffer)(arrayBufferOrString), { flag: 'w' });
    }
    (0, loader_utils_1.assert)(false);
}
exports.writeFileSync = writeFileSync;
