// Native
import { platform } from 'os';
import { basename, join, parse } from 'path';

// Vendor
// @ts-ignore
import imageSize from 'image-size';

/**
 * Get the /bin/ directory from the root of the project
 */
export const getBinaryDirectory = (): string => join(__dirname, '../../../bin/', platform());

/**
 * Get a file extension from a file path (without a file basename)
 *
 * @param filepath Input filepath
 */
export const getFileExtension = (filepath: string): string => parse(filepath).ext;

/**
 * Get a file basename from a file path (without a file extension)
 *
 * @param filepath Input filepath
 */
export const getFileName = (filepath: string): string =>
  basename(filepath, getFileExtension(filepath));

/**
 * Get image size
 *
 * @param filepath Path to image
 */
export const getImageSize = (filepath: string): { width: number; height: number } =>
  imageSize(filepath);

/**
 * Get mip map levels based on initial value
 *
 * @param value Initial value
 */
export const getMipChainLevels = (value: number): number => Math.floor(Math.log2(value)) + 1;

/**
 * Create flags out of custom flags passed in through the --flag parameter
 *
 * @param flags Array of flags to pass to the tool
 */
export const createFlagsForTool = (flags: string[]): string[] => flags.map(flag => `-${flag}`);

/**
 * Split flag name and flag value passed in through the --flag parameter
 *
 * @param flags Array of flags to pass to the tool
 */
export const splitFlagAndValue = (flags: any[]): string[] =>
  [].concat(...flags.map(flag => flag.split(' ')));
