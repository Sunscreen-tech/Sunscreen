"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Native
const os_1 = require("os");
// Compressors
const spawnProcess_1 = require("./spawnProcess");
const validateArgs_1 = require("./validateArgs");
// Constants
const constants_1 = require("../constants");
// Utilities
const utilities_1 = require("../utilities");
/**
 * Compress texture with the S3TC compression format
 */
exports.compressWithCrunch = (args) => {
    if (args.type === constants_1.S3TC) {
        validateArgs_1.validateArgs(args, constants_1.S3TC_SUPPORTED_INPUT_TYPES, constants_1.S3TC_SUPPORTED_OUTPUT_TYPES, constants_1.S3TC_COMPRESSION_TYPES, constants_1.S3TC_QUALITY_TYPES);
    }
    else {
        throw new Error('Unknown compression format');
    }
    const flagMapping = [
        '-file',
        args.input,
        '-out',
        args.output,
        '-fileformat',
        'ktx',
        `-${args.compression}`,
        '-dxtQuality',
        `${args.quality}`,
        '-helperThreads',
        os_1.cpus().length.toString(),
    ];
    if (args.mipmap) {
        const { width } = utilities_1.getImageSize(args.input);
        flagMapping.push('-mipMode', 'Generate');
        flagMapping.push('-maxmips', utilities_1.getMipChainLevels(width).toString());
    }
    else {
        flagMapping.push('-mipMode', 'None');
    }
    if (args.flipY) {
        flagMapping.push('-yflip');
    }
    return spawnProcess_1.spawnProcess(args, flagMapping, 'crunch');
};
//# sourceMappingURL=compressWithCrunch.js.map