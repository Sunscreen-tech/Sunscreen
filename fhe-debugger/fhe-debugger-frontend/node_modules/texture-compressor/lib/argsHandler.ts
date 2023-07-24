// Vendor
import { ArgumentParser } from 'argparse';

// Package
import * as pkg from '../package.json';

// Constants
import {
  ASTC_COMPRESSION_TYPES,
  ASTC_QUALITY_TYPES,
  COMPRESSION_FORMAT_FLAGS,
  ETC_COMPRESSION_TYPES,
  ETC_QUALITY_TYPES,
  IS_ASTC,
  IS_ETC,
  IS_PVRTC,
  IS_S3TC,
  PVRTC_COMPRESSION_TYPES,
  PVRTC_QUALITY_TYPES,
  S3TC_COMPRESSION_TYPES,
  S3TC_QUALITY_TYPES,
} from './constants';

/**
 * Create CLI arguments
 */
const createParserArguments = (): ICLIArgs => {
  const parser = new ArgumentParser({
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
    choices: COMPRESSION_FORMAT_FLAGS,
    help: 'Compression format',
    required: true,
  });

  // Compression internal format flag
  parser.addArgument(['-c', '--compression'], {
    choices: [
      ...(IS_ASTC ? ASTC_COMPRESSION_TYPES : []),
      ...(IS_ETC ? ETC_COMPRESSION_TYPES : []),
      ...(IS_PVRTC ? PVRTC_COMPRESSION_TYPES : []),
      ...(IS_S3TC ? S3TC_COMPRESSION_TYPES : []),
    ],
    help: 'Compression internal format',
    required: true,
  });

  // Quality flag
  parser.addArgument(['-q', '--quality'], {
    choices: [
      ...(IS_ASTC ? ASTC_QUALITY_TYPES : []),
      ...(IS_ETC ? ETC_QUALITY_TYPES : []),
      ...(IS_PVRTC ? PVRTC_QUALITY_TYPES : []),
      ...(IS_S3TC ? S3TC_QUALITY_TYPES : []),
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

export interface ICLIArgs {
  input: string;
  output: string;
  type: string;
  compression: string;
  quality: string;
  mipmap?: boolean;
  flipY?: boolean;
  square?: string;
  pot?: string;
  flags?: string[] | null;
  verbose?: boolean;
}

export const CLIArgs = createParserArguments();
