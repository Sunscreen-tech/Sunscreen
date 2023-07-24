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
exports.makeWritableFile = void 0;
// Forked from https://github.com/kbajalc/parquets under MIT license (Copyright (c) 2017 ironSource Ltd.)
const globals_1 = require("../env-utils/globals");
const fs = __importStar(require("../node/fs"));
/** Helper function to create an envelope reader for a binary memory input */
function makeWritableFile(pathOrStream, options) {
    if (globals_1.isBrowser) {
        return {
            write: async () => { },
            close: async () => { }
        };
    }
    const outputStream = typeof pathOrStream === 'string' ? fs.createWriteStream(pathOrStream, options) : pathOrStream;
    return {
        write: async (buffer) => new Promise((resolve, reject) => {
            outputStream.write(buffer, (err) => (err ? reject(err) : resolve()));
        }),
        close: () => new Promise((resolve, reject) => {
            outputStream.close((err) => (err ? reject(err) : resolve()));
        })
    };
}
exports.makeWritableFile = makeWritableFile;
