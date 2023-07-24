import { read } from 'ktx-parse';
import { extractMipmapImages } from '../utils/extract-mipmap-images';
import { mapVkFormatToWebGL } from '../utils/ktx-format-helper';
const KTX2_ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
export function isKTX(data) {
  const id = new Uint8Array(data);
  const notKTX = id.byteLength < KTX2_ID.length || id[0] !== KTX2_ID[0] || id[1] !== KTX2_ID[1] || id[2] !== KTX2_ID[2] || id[3] !== KTX2_ID[3] || id[4] !== KTX2_ID[4] || id[5] !== KTX2_ID[5] || id[6] !== KTX2_ID[6] || id[7] !== KTX2_ID[7] || id[8] !== KTX2_ID[8] || id[9] !== KTX2_ID[9] || id[10] !== KTX2_ID[10] || id[11] !== KTX2_ID[11];
  return !notKTX;
}
export function parseKTX(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const ktx = read(uint8Array);
  const mipMapLevels = Math.max(1, ktx.levels.length);
  const width = ktx.pixelWidth;
  const height = ktx.pixelHeight;
  const internalFormat = mapVkFormatToWebGL(ktx.vkFormat);
  return extractMipmapImages(ktx.levels, {
    mipMapLevels,
    width,
    height,
    sizeFunction: level => level.uncompressedByteLength,
    internalFormat
  });
}
//# sourceMappingURL=parse-ktx.js.map