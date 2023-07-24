import { ICLIArgs } from '../argsHandler';
/**
 * Validate if the passed in images are accepted by the compression tool
 *
 * @param args Command line arguments
 * @param inputTypes List of valid input types
 * @param outputTypes List of valid output types
 * @param compressionTypes List of valid compression types
 * @param qualityTypes List of valid quality types
 */
export declare const validateArgs: (args: ICLIArgs, inputTypes: string[], outputTypes: string[], compressionTypes: string[], qualityTypes: string[]) => void;
