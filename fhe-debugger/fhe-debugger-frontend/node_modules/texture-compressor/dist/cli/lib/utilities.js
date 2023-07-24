"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Native
const os_1 = require("os");
const path_1 = require("path");
// Vendor
// @ts-ignore
const image_size_1 = __importDefault(require("image-size"));
/**
 * Get the /bin/ directory from the root of the project
 */
exports.getBinaryDirectory = () => path_1.join(__dirname, '../../../bin/', os_1.platform());
/**
 * Get a file extension from a file path (without a file basename)
 *
 * @param filepath Input filepath
 */
exports.getFileExtension = (filepath) => path_1.parse(filepath).ext;
/**
 * Get a file basename from a file path (without a file extension)
 *
 * @param filepath Input filepath
 */
exports.getFileName = (filepath) => path_1.basename(filepath, exports.getFileExtension(filepath));
/**
 * Get image size
 *
 * @param filepath Path to image
 */
exports.getImageSize = (filepath) => image_size_1.default(filepath);
/**
 * Get mip map levels based on initial value
 *
 * @param value Initial value
 */
exports.getMipChainLevels = (value) => Math.floor(Math.log2(value)) + 1;
/**
 * Create flags out of custom flags passed in through the --flag parameter
 *
 * @param flags Array of flags to pass to the tool
 */
exports.createFlagsForTool = (flags) => flags.map(flag => `-${flag}`);
/**
 * Split flag name and flag value passed in through the --flag parameter
 *
 * @param flags Array of flags to pass to the tool
 */
exports.splitFlagAndValue = (flags) => [].concat(...flags.map(flag => flag.split(' ')));
//# sourceMappingURL=utilities.js.map