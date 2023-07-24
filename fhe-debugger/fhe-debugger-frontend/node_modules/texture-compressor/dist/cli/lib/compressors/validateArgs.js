"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Utilities
const utilities_1 = require("../utilities");
/**
 * Validate if the passed in images are accepted by the compression tool
 *
 * @param args Command line arguments
 * @param inputTypes List of valid input types
 * @param outputTypes List of valid output types
 * @param compressionTypes List of valid compression types
 * @param qualityTypes List of valid quality types
 */
exports.validateArgs = (args, inputTypes, outputTypes, compressionTypes, qualityTypes) => {
    if (!args.input) {
        throw new Error('Input path is required');
    }
    if (!args.output) {
        throw new Error('Output path is required');
    }
    const inputFileExtension = utilities_1.getFileExtension(args.input);
    const outputFileExtension = utilities_1.getFileExtension(args.output);
    if (!outputTypes.includes(outputFileExtension)) {
        throw new Error(`${outputFileExtension} is not supported. The supported filetypes are: [${outputTypes}]`);
    }
    if (!inputTypes.includes(inputFileExtension)) {
        throw new Error(`${inputFileExtension} is not supported. The supported filetypes are: [${inputTypes}]`);
    }
    if (!args.compression) {
        throw new Error(`Supported compression options: ${compressionTypes}`);
    }
    if (!args.quality) {
        throw new Error(`Supported quality options: ${qualityTypes}`);
    }
};
//# sourceMappingURL=validateArgs.js.map