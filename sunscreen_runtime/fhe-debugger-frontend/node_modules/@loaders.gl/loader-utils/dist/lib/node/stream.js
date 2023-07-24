"use strict";
// loaders.gl, MIT license
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupported = exports.Transform = void 0;
const stream_1 = __importDefault(require("stream"));
exports.isSupported = Boolean(stream_1.default);
// paths
try {
    /** Wrapper for Node.js fs method */
    exports.Transform = stream_1.default.Transform;
}
catch {
    // ignore
}
