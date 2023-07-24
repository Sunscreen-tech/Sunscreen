import { getStringFromArrayBuffer } from './parse-utils';
const SIZEOF_UINT32 = 4;
const DEPRECATION_WARNING = 'b3dm tile in legacy format.';
export function parse3DTileTablesHeaderSync(tile, arrayBuffer, byteOffset) {
  const view = new DataView(arrayBuffer);
  let batchLength;
  tile.header = tile.header || {};
  let featureTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  let featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  let batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  let batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  if (batchTableJsonByteLength >= 570425344) {
    byteOffset -= SIZEOF_UINT32 * 2;
    batchLength = featureTableJsonByteLength;
    batchTableJsonByteLength = featureTableBinaryByteLength;
    batchTableBinaryByteLength = 0;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    console.warn(DEPRECATION_WARNING);
  } else if (batchTableBinaryByteLength >= 570425344) {
    byteOffset -= SIZEOF_UINT32;
    batchLength = batchTableJsonByteLength;
    batchTableJsonByteLength = featureTableJsonByteLength;
    batchTableBinaryByteLength = featureTableBinaryByteLength;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    console.warn(DEPRECATION_WARNING);
  }
  tile.header.featureTableJsonByteLength = featureTableJsonByteLength;
  tile.header.featureTableBinaryByteLength = featureTableBinaryByteLength;
  tile.header.batchTableJsonByteLength = batchTableJsonByteLength;
  tile.header.batchTableBinaryByteLength = batchTableBinaryByteLength;
  tile.header.batchLength = batchLength;
  return byteOffset;
}
export function parse3DTileTablesSync(tile, arrayBuffer, byteOffset, options) {
  byteOffset = parse3DTileFeatureTable(tile, arrayBuffer, byteOffset, options);
  byteOffset = parse3DTileBatchTable(tile, arrayBuffer, byteOffset, options);
  return byteOffset;
}
function parse3DTileFeatureTable(tile, arrayBuffer, byteOffset, options) {
  const {
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchLength
  } = tile.header;
  tile.featureTableJson = {
    BATCH_LENGTH: batchLength || 0
  };
  if (featureTableJsonByteLength > 0) {
    const featureTableString = getStringFromArrayBuffer(arrayBuffer, byteOffset, featureTableJsonByteLength);
    tile.featureTableJson = JSON.parse(featureTableString);
  }
  byteOffset += featureTableJsonByteLength;
  tile.featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
  byteOffset += featureTableBinaryByteLength;
  return byteOffset;
}
function parse3DTileBatchTable(tile, arrayBuffer, byteOffset, options) {
  const {
    batchTableJsonByteLength,
    batchTableBinaryByteLength
  } = tile.header;
  if (batchTableJsonByteLength > 0) {
    const batchTableString = getStringFromArrayBuffer(arrayBuffer, byteOffset, batchTableJsonByteLength);
    tile.batchTableJson = JSON.parse(batchTableString);
    byteOffset += batchTableJsonByteLength;
    if (batchTableBinaryByteLength > 0) {
      tile.batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
      tile.batchTableBinary = new Uint8Array(tile.batchTableBinary);
      byteOffset += batchTableBinaryByteLength;
    }
  }
  return byteOffset;
}
//# sourceMappingURL=parse-3d-tile-tables.js.map