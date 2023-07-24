"use strict";
// loaders.gl, MIT license
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
exports._typecheckLERCLoader = exports.LERCLoader = void 0;
const Lerc = __importStar(require("lerc"));
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for the LERC raster format
 */
exports.LERCLoader = {
    id: 'lerc',
    name: 'LERC',
    module: 'wms',
    version: VERSION,
    worker: false,
    extensions: ['lrc', 'lerc', 'lerc2', 'lerc1'],
    mimeTypes: ['application/octet-stream'],
    // test: ?,
    options: {
        wms: {}
    },
    parse: async (arrayBuffer, options) => parseLERC(arrayBuffer, options)
};
async function parseLERC(arrayBuffer, options) {
    // Load the WASM library
    await Lerc.load();
    // Perform the decode
    const pixelBlock = Lerc.decode(arrayBuffer, options?.lerc);
    return pixelBlock;
}
exports._typecheckLERCLoader = exports.LERCLoader;
