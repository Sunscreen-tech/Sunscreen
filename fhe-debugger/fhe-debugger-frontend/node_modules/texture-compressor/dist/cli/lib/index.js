"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Compressors
const compressWithCrunch_1 = require("./compressors/compressWithCrunch");
const compressWithPVRTexTool_1 = require("./compressors/compressWithPVRTexTool");
// Constants
const constants_1 = require("./constants");
/**
 * Pack a texture into a GPU compressed texture format
 */
exports.pack = (CLIArgs) => {
    let args;
    if (!CLIArgs) {
        args = require('./argsHandler').CLIArgs;
    }
    else {
        args = CLIArgs;
    }
    if (!args.type) {
        throw new Error(`Supported compression formats: ${constants_1.COMPRESSION_FORMAT_FLAGS}`);
    }
    switch (args.type) {
        case 'astc':
        case 'etc':
        case 'pvrtc':
            return compressWithPVRTexTool_1.compressWithPVRTexTool(args);
        case 's3tc':
            return compressWithCrunch_1.compressWithCrunch(args);
        default:
            throw new Error(`Compression format: ${args.type} was not recognized`);
    }
};
//# sourceMappingURL=index.js.map