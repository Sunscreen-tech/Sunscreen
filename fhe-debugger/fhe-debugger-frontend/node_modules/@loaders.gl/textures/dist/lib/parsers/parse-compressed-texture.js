"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCompressedTexture = void 0;
const parse_ktx_1 = require("./parse-ktx");
const parse_dds_1 = require("./parse-dds");
const parse_pvr_1 = require("./parse-pvr");
/**
 * Deduces format and parses compressed texture loaded in ArrayBuffer
 * @param data - binary data of compressed texture
 * @returns Array of the texture levels
 */
function parseCompressedTexture(data) {
    if ((0, parse_ktx_1.isKTX)(data)) {
        // TODO: remove @ts-ignore when `parseKTX` output is normalized to loaders.gl texture format
        // @ts-ignore
        return (0, parse_ktx_1.parseKTX)(data);
    }
    if ((0, parse_dds_1.isDDS)(data)) {
        return (0, parse_dds_1.parseDDS)(data);
    }
    if ((0, parse_pvr_1.isPVR)(data)) {
        return (0, parse_pvr_1.parsePVR)(data);
    }
    throw new Error('Texture container format not recognized');
}
exports.parseCompressedTexture = parseCompressedTexture;
