import { loadCrunchModule } from './crunch-module-loader';
import { GL_EXTENSIONS_CONSTANTS } from '../gl-extensions';
import { assert } from '@loaders.gl/loader-utils';
import { getDxt1LevelSize, getDxtXLevelSize } from './parse-dds';
import { extractMipmapImages } from '../utils/extract-mipmap-images';
const CRN_FORMAT = {
  cCRNFmtInvalid: -1,
  cCRNFmtDXT1: 0,
  cCRNFmtDXT3: 1,
  cCRNFmtDXT5: 2
};
const DXT_FORMAT_MAP = {
  [CRN_FORMAT.cCRNFmtDXT1]: {
    pixelFormat: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT,
    sizeFunction: getDxt1LevelSize
  },
  [CRN_FORMAT.cCRNFmtDXT3]: {
    pixelFormat: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT3_EXT,
    sizeFunction: getDxtXLevelSize
  },
  [CRN_FORMAT.cCRNFmtDXT5]: {
    pixelFormat: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT,
    sizeFunction: getDxtXLevelSize
  }
};
let cachedDstSize = 0;
let dst;
export async function parseCrunch(data, options) {
  const crunchModule = await loadCrunchModule(options);
  const srcSize = data.byteLength;
  const bytes = new Uint8Array(data);
  const src = crunchModule._malloc(srcSize);
  arrayBufferCopy(bytes, crunchModule.HEAPU8, src, srcSize);
  const format = crunchModule._crn_get_dxt_format(src, srcSize);
  assert(Boolean(DXT_FORMAT_MAP[format]), 'Unsupported format');
  const mipMapLevels = crunchModule._crn_get_levels(src, srcSize);
  const width = crunchModule._crn_get_width(src, srcSize);
  const height = crunchModule._crn_get_height(src, srcSize);
  const sizeFunction = DXT_FORMAT_MAP[format].sizeFunction;
  let dstSize = 0;
  for (let i = 0; i < mipMapLevels; ++i) {
    dstSize += sizeFunction(width >> i, height >> i);
  }
  if (cachedDstSize < dstSize) {
    if (dst) {
      crunchModule._free(dst);
    }
    dst = crunchModule._malloc(dstSize);
    cachedDstSize = dstSize;
  }
  crunchModule._crn_decompress(src, srcSize, dst, dstSize, 0, mipMapLevels);
  crunchModule._free(src);
  const image = new Uint8Array(crunchModule.HEAPU8.buffer, dst, dstSize).slice();
  return extractMipmapImages(image, {
    mipMapLevels,
    width,
    height,
    sizeFunction,
    internalFormat: DXT_FORMAT_MAP[format].pixelFormat
  });
}
function arrayBufferCopy(srcData, dstData, dstByteOffset, numBytes) {
  let i;
  const dst32Offset = dstByteOffset / 4;
  const tail = numBytes % 4;
  const src32 = new Uint32Array(srcData.buffer, 0, (numBytes - tail) / 4);
  const dst32 = new Uint32Array(dstData.buffer);
  for (i = 0; i < src32.length; i++) {
    dst32[dst32Offset + i] = src32[i];
  }
  for (i = numBytes - tail; i < numBytes; i++) {
    dstData[dstByteOffset + i] = srcData[i];
  }
}
//# sourceMappingURL=parse-crunch.js.map