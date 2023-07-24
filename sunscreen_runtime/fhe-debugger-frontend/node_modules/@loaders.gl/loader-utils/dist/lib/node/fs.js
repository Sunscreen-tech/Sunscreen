"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._readToArrayBuffer = exports.isSupported = exports.createWriteStream = exports.fstat = exports.read = exports.close = exports.open = exports.writeFileSync = exports.writeFile = exports.readFileSync = exports.readFile = exports.stat = exports.readdir = void 0;
// fs wrapper (promisified fs + avoids bundling fs in browsers)
const fs_1 = __importDefault(require("fs"));
const buffer_1 = require("./buffer");
const promisify_1 = require("./promisify");
exports.isSupported = Boolean(fs_1.default);
// paths
try {
    /** Wrapper for Node.js fs method */
    exports.readdir = (0, promisify_1.promisify2)(fs_1.default.readdir);
    /** Wrapper for Node.js fs method */
    exports.stat = (0, promisify_1.promisify2)(fs_1.default.stat);
    /** Wrapper for Node.js fs method */
    exports.readFile = fs_1.default.readFile;
    /** Wrapper for Node.js fs method */
    exports.readFileSync = fs_1.default.readFileSync;
    /** Wrapper for Node.js fs method */
    exports.writeFile = (0, promisify_1.promisify3)(fs_1.default.writeFile);
    /** Wrapper for Node.js fs method */
    exports.writeFileSync = fs_1.default.writeFileSync;
    // file descriptors
    /** Wrapper for Node.js fs method */
    exports.open = fs_1.default.open;
    /** Wrapper for Node.js fs method */
    exports.close = (fd) => new Promise((resolve, reject) => fs_1.default.close(fd, (err) => (err ? reject(err) : resolve())));
    /** Wrapper for Node.js fs method */
    exports.read = fs_1.default.read;
    /** Wrapper for Node.js fs method */
    exports.fstat = fs_1.default.fstat;
    exports.createWriteStream = fs_1.default.createWriteStream;
    exports.isSupported = Boolean(fs_1.default);
}
catch {
    // ignore
}
async function _readToArrayBuffer(fd, start, length) {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await (0, exports.read)(fd, buffer, 0, length, start);
    if (bytesRead !== length) {
        throw new Error('fs.read failed');
    }
    return (0, buffer_1.toArrayBuffer)(buffer);
}
exports._readToArrayBuffer = _readToArrayBuffer;
