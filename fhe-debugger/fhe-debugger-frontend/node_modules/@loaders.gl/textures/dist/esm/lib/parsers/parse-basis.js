import { loadBasisEncoderModule, loadBasisTrascoderModule } from './basis-module-loader';
import { GL_EXTENSIONS_CONSTANTS } from '../gl-extensions';
import { getSupportedGPUTextureFormats } from '../utils/texture-formats';
import { isKTX } from './parse-ktx';
const OutputFormat = {
  etc1: {
    basisFormat: 0,
    compressed: true,
    format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_ETC1_WEBGL
  },
  etc2: {
    basisFormat: 1,
    compressed: true
  },
  bc1: {
    basisFormat: 2,
    compressed: true,
    format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT
  },
  bc3: {
    basisFormat: 3,
    compressed: true,
    format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT
  },
  bc4: {
    basisFormat: 4,
    compressed: true
  },
  bc5: {
    basisFormat: 5,
    compressed: true
  },
  'bc7-m6-opaque-only': {
    basisFormat: 6,
    compressed: true
  },
  'bc7-m5': {
    basisFormat: 7,
    compressed: true
  },
  'pvrtc1-4-rgb': {
    basisFormat: 8,
    compressed: true,
    format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_PVRTC_4BPPV1_IMG
  },
  'pvrtc1-4-rgba': {
    basisFormat: 9,
    compressed: true,
    format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
  },
  'astc-4x4': {
    basisFormat: 10,
    compressed: true,
    format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_4X4_KHR
  },
  'atc-rgb': {
    basisFormat: 11,
    compressed: true
  },
  'atc-rgba-interpolated-alpha': {
    basisFormat: 12,
    compressed: true
  },
  rgba32: {
    basisFormat: 13,
    compressed: false
  },
  rgb565: {
    basisFormat: 14,
    compressed: false
  },
  bgr565: {
    basisFormat: 15,
    compressed: false
  },
  rgba4444: {
    basisFormat: 16,
    compressed: false
  }
};
export default async function parseBasis(data, options) {
  if (options.basis.containerFormat === 'auto') {
    if (isKTX(data)) {
      const fileConstructors = await loadBasisEncoderModule(options);
      return parseKTX2File(fileConstructors.KTX2File, data, options);
    }
    const {
      BasisFile
    } = await loadBasisTrascoderModule(options);
    return parseBasisFile(BasisFile, data, options);
  }
  switch (options.basis.module) {
    case 'encoder':
      const fileConstructors = await loadBasisEncoderModule(options);
      switch (options.basis.containerFormat) {
        case 'ktx2':
          return parseKTX2File(fileConstructors.KTX2File, data, options);
        case 'basis':
        default:
          return parseBasisFile(fileConstructors.BasisFile, data, options);
      }
    case 'transcoder':
    default:
      const {
        BasisFile
      } = await loadBasisTrascoderModule(options);
      return parseBasisFile(BasisFile, data, options);
  }
}
function parseBasisFile(BasisFile, data, options) {
  const basisFile = new BasisFile(new Uint8Array(data));
  try {
    if (!basisFile.startTranscoding()) {
      throw new Error('Failed to start basis transcoding');
    }
    const imageCount = basisFile.getNumImages();
    const images = [];
    for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
      const levelsCount = basisFile.getNumLevels(imageIndex);
      const levels = [];
      for (let levelIndex = 0; levelIndex < levelsCount; levelIndex++) {
        levels.push(transcodeImage(basisFile, imageIndex, levelIndex, options));
      }
      images.push(levels);
    }
    return images;
  } finally {
    basisFile.close();
    basisFile.delete();
  }
}
function transcodeImage(basisFile, imageIndex, levelIndex, options) {
  const width = basisFile.getImageWidth(imageIndex, levelIndex);
  const height = basisFile.getImageHeight(imageIndex, levelIndex);
  const hasAlpha = basisFile.getHasAlpha();
  const {
    compressed,
    format,
    basisFormat
  } = getBasisOptions(options, hasAlpha);
  const decodedSize = basisFile.getImageTranscodedSizeInBytes(imageIndex, levelIndex, basisFormat);
  const decodedData = new Uint8Array(decodedSize);
  if (!basisFile.transcodeImage(decodedData, imageIndex, levelIndex, basisFormat, 0, 0)) {
    throw new Error('failed to start Basis transcoding');
  }
  return {
    width,
    height,
    data: decodedData,
    compressed,
    format,
    hasAlpha
  };
}
function parseKTX2File(KTX2File, data, options) {
  const ktx2File = new KTX2File(new Uint8Array(data));
  try {
    if (!ktx2File.startTranscoding()) {
      throw new Error('failed to start KTX2 transcoding');
    }
    const levelsCount = ktx2File.getLevels();
    const levels = [];
    for (let levelIndex = 0; levelIndex < levelsCount; levelIndex++) {
      levels.push(transcodeKTX2Image(ktx2File, levelIndex, options));
      break;
    }
    return [levels];
  } finally {
    ktx2File.close();
    ktx2File.delete();
  }
}
function transcodeKTX2Image(ktx2File, levelIndex, options) {
  const {
    alphaFlag,
    height,
    width
  } = ktx2File.getImageLevelInfo(levelIndex, 0, 0);
  const {
    compressed,
    format,
    basisFormat
  } = getBasisOptions(options, alphaFlag);
  const decodedSize = ktx2File.getImageTranscodedSizeInBytes(levelIndex, 0, 0, basisFormat);
  const decodedData = new Uint8Array(decodedSize);
  if (!ktx2File.transcodeImage(decodedData, levelIndex, 0, 0, basisFormat, 0, -1, -1)) {
    throw new Error('Failed to transcode KTX2 image');
  }
  return {
    width,
    height,
    data: decodedData,
    compressed,
    levelSize: decodedSize,
    hasAlpha: alphaFlag,
    format
  };
}
function getBasisOptions(options, hasAlpha) {
  let format = options && options.basis && options.basis.format;
  if (format === 'auto') {
    format = selectSupportedBasisFormat();
  }
  if (typeof format === 'object') {
    format = hasAlpha ? format.alpha : format.noAlpha;
  }
  format = format.toLowerCase();
  return OutputFormat[format];
}
export function selectSupportedBasisFormat() {
  const supportedFormats = getSupportedGPUTextureFormats();
  if (supportedFormats.has('astc')) {
    return 'astc-4x4';
  } else if (supportedFormats.has('dxt')) {
    return {
      alpha: 'bc3',
      noAlpha: 'bc1'
    };
  } else if (supportedFormats.has('pvrtc')) {
    return {
      alpha: 'pvrtc1-4-rgba',
      noAlpha: 'pvrtc1-4-rgb'
    };
  } else if (supportedFormats.has('etc1')) {
    return 'etc1';
  } else if (supportedFormats.has('etc2')) {
    return 'etc2';
  }
  return 'rgb565';
}
//# sourceMappingURL=parse-basis.js.map