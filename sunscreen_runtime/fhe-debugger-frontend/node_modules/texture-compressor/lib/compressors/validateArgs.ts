// Arguments
import { ICLIArgs } from '../argsHandler';

// Utilities
import { getFileExtension } from '../utilities';

/**
 * Validate if the passed in images are accepted by the compression tool
 *
 * @param args Command line arguments
 * @param inputTypes List of valid input types
 * @param outputTypes List of valid output types
 * @param compressionTypes List of valid compression types
 * @param qualityTypes List of valid quality types
 */
export const validateArgs = (
  args: ICLIArgs,
  inputTypes: string[],
  outputTypes: string[],
  compressionTypes: string[],
  qualityTypes: string[]
): void => {
  if (!args.input) {
    throw new Error('Input path is required');
  }

  if (!args.output) {
    throw new Error('Output path is required');
  }

  const inputFileExtension = getFileExtension(args.input);
  const outputFileExtension = getFileExtension(args.output);

  if (!outputTypes.includes(outputFileExtension)) {
    throw new Error(
      `${outputFileExtension} is not supported. The supported filetypes are: [${outputTypes}]`
    );
  }

  if (!inputTypes.includes(inputFileExtension)) {
    throw new Error(
      `${inputFileExtension} is not supported. The supported filetypes are: [${inputTypes}]`
    );
  }

  if (!args.compression) {
    throw new Error(`Supported compression options: ${compressionTypes}`);
  }

  if (!args.quality) {
    throw new Error(`Supported quality options: ${qualityTypes}`);
  }
};
