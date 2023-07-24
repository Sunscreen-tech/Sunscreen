"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Compressors
const spawnProcess_1 = require("./spawnProcess");
const validateArgs_1 = require("./validateArgs");
// Constants
const constants_1 = require("../constants");
// Utilities
const utilities_1 = require("../utilities");
/**
 * Compress texture with the ASTC, ETC or PVRTC compression format
 */
exports.compressWithPVRTexTool = (args) => {
    if (args.type === constants_1.ASTC) {
        validateArgs_1.validateArgs(args, constants_1.ASTC_SUPPORTED_INPUT_TYPES, constants_1.ASTC_SUPPORTED_OUTPUT_TYPES, constants_1.ASTC_COMPRESSION_TYPES, constants_1.ASTC_QUALITY_TYPES);
    }
    else if (args.type === constants_1.ETC) {
        validateArgs_1.validateArgs(args, constants_1.ETC_SUPPORTED_INPUT_TYPES, constants_1.ETC_SUPPORTED_OUTPUT_TYPES, constants_1.ETC_COMPRESSION_TYPES, constants_1.ETC_QUALITY_TYPES);
    }
    else if (args.type === constants_1.PVRTC) {
        validateArgs_1.validateArgs(args, constants_1.PVRTC_SUPPORTED_INPUT_TYPES, constants_1.PVRTC_SUPPORTED_OUTPUT_TYPES, constants_1.PVRTC_COMPRESSION_TYPES, constants_1.PVRTC_QUALITY_TYPES);
    }
    else {
        throw new Error('Unknown compression format');
    }
    const flagMapping = [
        '-i',
        args.input,
        '-o',
        args.output,
        '-f',
        `${args.compression}`,
        `-q`,
        `${args.quality}`,
    ];
    if (args.square !== 'no') {
        flagMapping.push('-square', args.square || '+');
    }
    if (args.pot !== 'no') {
        flagMapping.push('-pot', args.pot || '+');
    }
    if (args.mipmap) {
        const { width } = utilities_1.getImageSize(args.input);
        flagMapping.push('-m', utilities_1.getMipChainLevels(width).toString());
    }
    if (args.flipY) {
        flagMapping.push('-flip', 'y');
    }
    return spawnProcess_1.spawnProcess(args, flagMapping, 'PVRTexToolCLI');
};
//# sourceMappingURL=compressWithPVRTexTool.js.map