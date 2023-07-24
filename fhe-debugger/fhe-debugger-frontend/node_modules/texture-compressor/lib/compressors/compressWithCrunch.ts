// Native
import { cpus } from 'os';

// Arguments
import { ICLIArgs } from '../argsHandler';

// Compressors
import { spawnProcess } from './spawnProcess';
import { validateArgs } from './validateArgs';

// Constants
import {
  S3TC,
  S3TC_COMPRESSION_TYPES,
  S3TC_QUALITY_TYPES,
  S3TC_SUPPORTED_INPUT_TYPES,
  S3TC_SUPPORTED_OUTPUT_TYPES,
} from '../constants';

// Utilities
import { getImageSize, getMipChainLevels } from '../utilities';

/**
 * Compress texture with the S3TC compression format
 */
export const compressWithCrunch = (args: ICLIArgs): Promise<any> => {
  if (args.type === S3TC) {
    validateArgs(
      args,
      S3TC_SUPPORTED_INPUT_TYPES,
      S3TC_SUPPORTED_OUTPUT_TYPES,
      S3TC_COMPRESSION_TYPES,
      S3TC_QUALITY_TYPES
    );
  } else {
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
    cpus().length.toString(),
  ];

  if (args.mipmap) {
    const { width } = getImageSize(args.input);
    flagMapping.push('-mipMode', 'Generate');
    flagMapping.push('-maxmips', getMipChainLevels(width).toString());
  } else {
    flagMapping.push('-mipMode', 'None');
  }

  if (args.flipY) {
    flagMapping.push('-yflip');
  }

  return spawnProcess(args, flagMapping, 'crunch');
};
