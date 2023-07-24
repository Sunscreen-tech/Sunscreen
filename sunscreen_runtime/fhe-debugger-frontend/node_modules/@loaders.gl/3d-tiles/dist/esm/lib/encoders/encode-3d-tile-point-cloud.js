import { MAGIC_ARRAY } from '../constants';
import { encode3DTileHeader, encode3DTileByteLength } from './helpers/encode-3d-tile-header';
import { padStringToByteAlignment, copyStringToDataView, copyBinaryToDataView } from '@loaders.gl/loader-utils';
const DEFAULT_FEATURE_TABLE_JSON = {
  POINTS_LENGTH: 1,
  POSITIONS: {
    byteOffset: 0
  }
};
export function encodePointCloud3DTile(tile, dataView, byteOffset, options) {
  const {
    featureTableJson = DEFAULT_FEATURE_TABLE_JSON
  } = tile;
  let featureTableJsonString = JSON.stringify(featureTableJson);
  featureTableJsonString = padStringToByteAlignment(featureTableJsonString, 4);
  const {
    featureTableJsonByteLength = featureTableJsonString.length
  } = tile;
  const featureTableBinary = new ArrayBuffer(12);
  const featureTableBinaryByteLength = featureTableBinary.byteLength;
  tile = {
    magic: MAGIC_ARRAY.POINT_CLOUD,
    ...tile
  };
  const byteOffsetStart = byteOffset;
  byteOffset += encode3DTileHeader(tile, dataView, 0);
  if (dataView) {
    dataView.setUint32(byteOffset + 0, featureTableJsonByteLength, true);
    dataView.setUint32(byteOffset + 4, featureTableBinaryByteLength, true);
    dataView.setUint32(byteOffset + 8, 0, true);
    dataView.setUint32(byteOffset + 12, 0, true);
  }
  byteOffset += 16;
  byteOffset += copyStringToDataView(dataView, byteOffset, featureTableJsonString, featureTableJsonByteLength);
  byteOffset += copyBinaryToDataView(dataView, byteOffset, featureTableBinary, featureTableBinaryByteLength);
  encode3DTileByteLength(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-point-cloud.js.map