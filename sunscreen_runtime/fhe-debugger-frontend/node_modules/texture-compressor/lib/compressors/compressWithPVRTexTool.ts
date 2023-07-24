// Arguments
import { ICLIArgs } from '../argsHandler';

// Compressors
import { spawnProcess } from './spawnProcess';
import { validateArgs } from './validateArgs';

// Constants
import {
  ASTC,
  ASTC_COMPRESSION_TYPES,
  ASTC_QUALITY_TYPES,
  ASTC_SUPPORTED_INPUT_TYPES,
  ASTC_SUPPORTED_OUTPUT_TYPES,
  ETC,
  ETC_COMPRESSION_TYPES,
  ETC_QUALITY_TYPES,
  ETC_SUPPORTED_INPUT_TYPES,
  ETC_SUPPORTED_OUTPUT_TYPES,
  PVRTC,
  PVRTC_COMPRESSION_TYPES,
  PVRTC_QUALITY_TYPES,
  PVRTC_SUPPORTED_INPUT_TYPES,
  PVRTC_SUPPORTED_OUTPUT_TYPES,
} from '../constants';

// Utilities
import { getImageSize, getMipChainLevels } from '../utilities';

/**
 * Compress texture with the ASTC, ETC or PVRTC compression format
 */
export const compressWithPVRTexTool = (args: ICLIArgs): Promise<any> => {
  if (args.type === ASTC) {
    validateArgs(
      args,
      ASTC_SUPPORTED_INPUT_TYPES,
      ASTC_SUPPORTED_OUTPUT_TYPES,
      ASTC_COMPRESSION_TYPES,
      ASTC_QUALITY_TYPES
    );
  } else if (args.type === ETC) {
    validateArgs(
      args,
      ETC_SUPPORTED_INPUT_TYPES,
      ETC_SUPPORTED_OUTPUT_TYPES,
      ETC_COMPRESSION_TYPES,
      ETC_QUALITY_TYPES
    );
  } else if (args.type === PVRTC) {
    validateArgs(
      args,
      PVRTC_SUPPORTED_INPUT_TYPES,
      PVRTC_SUPPORTED_OUTPUT_TYPES,
      PVRTC_COMPRESSION_TYPES,
      PVRTC_QUALITY_TYPES
    );
  } else {
    throw new Error('Unknown compression format');
  }

  const flagMapping = [
    '-i',
    args.input,
    '-o',
    args.output,
    '-f',
    `${args.compression}`,
    `-q`,
    `${args.quality}`,
  ];

  if (args.square !== 'no') {
    flagMapping.push('-square', args.square || '+');
  }

  if (args.pot !== 'no') {
    flagMapping.push('-pot', args.pot || '+');
  }

  if (args.mipmap) {
    const { width } = getImageSize(args.input);
    flagMapping.push('-m', getMipChainLevels(width).toString());
  }

  if (args.flipY) {
    flagMapping.push('-flip', 'y');
  }

  return spawnProcess(args, flagMapping, 'PVRTexToolCLI');
};
