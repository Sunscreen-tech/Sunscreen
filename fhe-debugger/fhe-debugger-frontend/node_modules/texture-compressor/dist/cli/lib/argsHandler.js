"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Vendor
const argparse_1 = require("argparse");
// Package
const pkg = __importStar(require("../package.json"));
// Constants
const constants_1 = require("./constants");
/**
 * Create CLI arguments
 */
const createParserArguments = () => {
    const parser = new argparse_1.ArgumentParser({
        addHelp: true,
        description: pkg.description,
        version: pkg.version,
    });
    // File input flag
    parser.addArgument(['-i', '--input'], {
        help: 'Input file including path',
        required: false,
    });
    // File output flag
    parser.addArgument(['-o', '--output'], {
        help: 'Output location including path',
        required: true,
    });
    // Compression format flag
    parser.addArgument(['-t', '--type'], {
        choices: constants_1.COMPRESSION_FORMAT_FLAGS,
        help: 'Compression format',
        required: true,
    });
    // Compression internal format flag
    parser.addArgument(['-c', '--compression'], {
        choices: [
            ...(constants_1.IS_ASTC ? constants_1.ASTC_COMPRESSION_TYPES : []),
            ...(constants_1.IS_ETC ? constants_1.ETC_COMPRESSION_TYPES : []),
            ...(constants_1.IS_PVRTC ? constants_1.PVRTC_COMPRESSION_TYPES : []),
            ...(constants_1.IS_S3TC ? constants_1.S3TC_COMPRESSION_TYPES : []),
        ],
        help: 'Compression internal format',
        required: true,
    });
    // Quality flag
    parser.addArgument(['-q', '--quality'], {
        choices: [
            ...(constants_1.IS_ASTC ? constants_1.ASTC_QUALITY_TYPES : []),
            ...(constants_1.IS_ETC ? constants_1.ETC_QUALITY_TYPES : []),
            ...(constants_1.IS_PVRTC ? constants_1.PVRTC_QUALITY_TYPES : []),
            ...(constants_1.IS_S3TC ? constants_1.S3TC_QUALITY_TYPES : []),
        ],
        help: 'Quality type',
        required: true,
    });
    // Mipmapping flag
    parser.addArgument(['-m', '--mipmap'], {
        action: 'storeTrue',
        help: 'Enable mipmapping',
        required: false,
    });
    // Vertical flip flag
    parser.addArgument(['-y', '--flipY'], {
        action: 'storeTrue',
        help: 'Output file flipped vertically',
        required: false,
    });
    // Resize square flag
    parser.addArgument(['-rs', '--square'], {
        choices: ['no', '-', '+'],
        help: 'Force the texture into a square (default: +)',
        required: false,
    });
    // Resize power of two flag
    parser.addArgument(['-rp', '--pot'], {
        choices: ['no', '-', '+'],
        help: 'Force the texture into power of two dimensions (default: +)',
        required: false,
    });
    // Arbitrary flags to pass on to specific tool
    parser.addArgument(['-f', '--flags'], {
        help: 'Any flags you want to directly pass to the compression tool',
        nargs: '*',
    });
    // Verbose logging
    parser.addArgument(['-vb', '--verbose'], {
        action: 'storeTrue',
        help: 'Enable verbose logging',
        required: false,
    });
    return parser.parseArgs();
};
exports.CLIArgs = createParserArguments();
//# sourceMappingURL=argsHandler.js.map