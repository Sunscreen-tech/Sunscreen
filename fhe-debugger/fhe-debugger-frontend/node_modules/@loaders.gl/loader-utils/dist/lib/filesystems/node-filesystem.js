"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("../node/fs"));
/**
 * FileSystem pass-through for Node.js
 * Compatible with BrowserFileSystem.
 * @param options
 */
class NodeFileSystem {
    // implements IFileSystem
    constructor(options) {
        this.fetch = options._fetch;
    }
    async readdir(dirname = '.', options) {
        return await fs.readdir(dirname, options);
    }
    async stat(path, options) {
        const info = await fs.stat(path, options);
        return { size: Number(info.size), isDirectory: () => false, info };
    }
    async fetch(path, options) {
        // Falls back to handle https:/http:/data: etc fetches
        // eslint-disable-next-line
        const fallbackFetch = options.fetch || this.fetch;
        return fallbackFetch(path, options);
    }
    // implements IRandomAccessFileSystem
    async open(path, flags, mode) {
        return await fs.open(path, flags);
    }
    async close(fd) {
        return await fs.close(fd);
    }
    async fstat(fd) {
        const info = await fs.fstat(fd);
        return info;
    }
    async read(fd, 
    // @ts-ignore Possibly null
    { buffer = null, offset = 0, length = buffer.byteLength, position = null }) {
        let totalBytesRead = 0;
        // Read in loop until we get required number of bytes
        while (totalBytesRead < length) {
            const { bytesRead } = await fs.read(fd, buffer, offset + totalBytesRead, length - totalBytesRead, position + totalBytesRead);
            totalBytesRead += bytesRead;
        }
        return { bytesRead: totalBytesRead, buffer };
    }
}
exports.default = NodeFileSystem;
