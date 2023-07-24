/**
 * Get the /bin/ directory from the root of the project
 */
export declare const getBinaryDirectory: () => string;
/**
 * Get a file extension from a file path (without a file basename)
 *
 * @param filepath Input filepath
 */
export declare const getFileExtension: (filepath: string) => string;
/**
 * Get a file basename from a file path (without a file extension)
 *
 * @param filepath Input filepath
 */
export declare const getFileName: (filepath: string) => string;
/**
 * Get image size
 *
 * @param filepath Path to image
 */
export declare const getImageSize: (filepath: string) => {
    width: number;
    height: number;
};
/**
 * Get mip map levels based on initial value
 *
 * @param value Initial value
 */
export declare const getMipChainLevels: (value: number) => number;
/**
 * Create flags out of custom flags passed in through the --flag parameter
 *
 * @param flags Array of flags to pass to the tool
 */
export declare const createFlagsForTool: (flags: string[]) => string[];
/**
 * Split flag name and flag value passed in through the --flag parameter
 *
 * @param flags Array of flags to pass to the tool
 */
export declare const splitFlagAndValue: (flags: any[]) => string[];
